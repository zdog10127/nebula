# Assinatura de código (Windows e macOS)

Isso ainda **não está implementado** — só documentado. Assinar o instalador
exige comprar um certificado, o que é uma decisão e um gasto seus; ninguém
pode fazer essa compra por você. O que segue é o passo a passo pra quando
você decidir seguir com isso — o build (`.github/workflows/release.yml`,
`package.json`) já está preparado pra detectar as credenciais automaticamente
assim que elas existirem, sem precisar mexer em mais nada.

## Windows

Sem assinatura, o instalador (`.exe` da NSIS) dispara o aviso do
SmartScreen "Windows protegeu seu PC" / editor desconhecido. Duas opções pra
resolver:

### Opção A — Certificado tradicional (OV/EV) de uma CA

Compre um certificado *code signing* (Sectigo, DigiCert, SSL.com, etc. —
os preços variam bastante, gire em torno de US$ 70–400/ano pra OV, e EV
custa mais mas remove o aviso do SmartScreen imediatamente; um cert OV
some com o aviso depois que a Microsoft acumular reputação sobre o
binário). Você recebe um arquivo `.pfx`/`.p12` com senha.

O `electron-builder` já detecta automaticamente as variáveis de ambiente
`CSC_LINK` (caminho ou URL do `.pfx`) e `CSC_KEY_PASSWORD` (senha) — não
precisa editar `package.json`. Basta:

1. Codificar o `.pfx` em base64 e salvar como secret do repositório
   `WIN_CSC_LINK_BASE64` (ou subir o arquivo em algum storage privado e
   usar a URL diretamente em `CSC_LINK`).
2. Salvar a senha como secret `WIN_CSC_KEY_PASSWORD`.
3. No `.github/workflows/release.yml`, no job do `windows-latest`, adicionar:

   ```yaml
   - name: Decode certificate
     if: runner.os == 'Windows'
     shell: bash
     run: echo "${{ secrets.WIN_CSC_LINK_BASE64 }}" | base64 -d > cert.pfx

   - name: Build and publish
     run: npm run electron:publish
     env:
       GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
       CSC_LINK: cert.pfx
       CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
   ```

### Opção B — Azure Trusted Signing (mais barato, sem hardware token)

A Microsoft tem um serviço mais novo e mais barato (assinatura mensal, sem
precisar de um token USB/HSM que os certs EV tradicionais exigem). Requer
conta Azure + uma identidade verificada. Docs:
https://learn.microsoft.com/azure/trusted-signing/overview — o
`electron-builder` tem suporte via o plugin
[`@electron/windows-sign`](https://www.electron.build/code-signing) com
Trusted Signing configurado em `win.azureSignOptions`.

## macOS

Sem assinatura + notarização, o macOS bloqueia o app com "não pode ser
aberto porque o desenvolvedor não pode ser verificado" (Gatekeeper). Hoje o
`dmg`/`zip` são gerados **sem assinatura** (`"sign": false` no `dmg` do
`package.json`, `hardenedRuntime: true` já deixado configurado pra quando
isso mudar) — o usuário final consegue abrir mesmo assim clicando com o
botão direito → Abrir, mas é uma fricção grande pra distribuir pra outras
pessoas.

Pra assinar de verdade:

1. Conta no [Apple Developer Program](https://developer.apple.com/programs/)
   (US$ 99/ano).
2. Gerar um certificado **Developer ID Application** no Xcode ou no portal
   da Apple, exportar como `.p12` com senha.
3. Gerar uma **API Key** de App Store Connect (Users and Access → Keys →
   App Store Connect API) — usada pra notarização automática.
4. Secrets no repositório: `MAC_CSC_LINK_BASE64` (o `.p12` em base64),
   `MAC_CSC_KEY_PASSWORD`, `APPLE_API_KEY_BASE64`, `APPLE_API_KEY_ID`,
   `APPLE_API_ISSUER`.
5. No job do `macos-latest`:

   ```yaml
   - name: Decode certificate
     if: runner.os == 'macOS'
     run: echo "${{ secrets.MAC_CSC_LINK_BASE64 }}" | base64 -d > cert.p12

   - name: Decode Apple API key
     if: runner.os == 'macOS'
     run: |
       mkdir -p private_keys
       echo "${{ secrets.APPLE_API_KEY_BASE64 }}" | base64 -d > "private_keys/AuthKey_${{ secrets.APPLE_API_KEY_ID }}.p8"

   - name: Build and publish
     run: npm run electron:publish
     env:
       GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
       CSC_LINK: cert.p12
       CSC_KEY_PASSWORD: ${{ secrets.MAC_CSC_KEY_PASSWORD }}
       APPLE_API_KEY: private_keys/AuthKey_${{ secrets.APPLE_API_KEY_ID }}.p8
       APPLE_API_KEY_ID: ${{ secrets.APPLE_API_KEY_ID }}
       APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}
   ```

   E remover `"sign": false` do bloco `dmg` em `package.json` — com as
   variáveis acima presentes, o `electron-builder` assina e notariza sozinho
   (`hardenedRuntime: true` já está lá, é pré-requisito pra notarização).

## Resumo do custo

| | Custo aproximado | Remove o aviso |
|---|---|---|
| Windows OV | ~US$ 70–250/ano | Depois de acumular reputação |
| Windows EV | ~US$ 300–400/ano | Imediatamente |
| Azure Trusted Signing | ~US$ 10/mês | Imediatamente |
| Apple Developer Program | US$ 99/ano | Sim (com notarização) |

Nenhuma dessas contas ou certificados foi comprado — isso fica pra você
decidir e executar quando fizer sentido no orçamento.
