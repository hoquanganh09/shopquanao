import React from 'react';
import { Link } from "react-router-dom";

const UserBuyMost = () => {
  return (
    <div style={{width:"100%", height:"500px"}}>
    <h1 style={{textAlign:"center", padding:"1vh"}}>Biểu đồ người dùng mua hàng nhiều nhất từng tháng </h1>
    <Link to="/admin/users"> <a>Xem thêm</a></Link>
  <iframe 
  style={{width:"100%", height:"500px"}}
  src=""
  title="YouTube video"
></iframe>
</div>
  )
}

export default UserBuyMost