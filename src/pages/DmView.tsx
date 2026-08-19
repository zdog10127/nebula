import { Outlet } from 'react-router-dom'
import DmSidebar from '../components/DmSidebar'

export default function DmView() {
  return (
    <>
      <DmSidebar />
      <Outlet />
    </>
  )
}
