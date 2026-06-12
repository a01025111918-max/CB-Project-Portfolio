// 앱의 최상위 컴포넌트입니다.
// 공통 헤더/푸터를 렌더링하고, URL 경로에 따라 페이지를 라우팅합니다.
//import { useState } from "react";

import "./index.css";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import "./App.css";
import "./font.css";
import Footer from "./components/commons/Footer";
import Header from "./components/commons/Header";
import Main from "./pages/Main";

import Store from "./components/board/store/store";
import StoreDetail from "./components/board/store/storeDetail";
import ProductRegistration from "./components/board/store/productRegistration";
import OrderPage from "./pages/payment/OrderPage";
import TossTestPayment from "./pages/payment/TossTestPayment";
import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentFail from "./pages/payment/PaymentFail";
import JoinPage from "./pages/member/JoinPage";

import { useEffect } from "react";
import useAuthStore from "./store/useAuthStore";

import axios from "axios";
import SupportPage from "./pages/support/SupportPage";

import MapCommunity from "./pages/MapCommunityPage/MapCommunityPage";
import TreeGrowMainPage from "./pages/TreeGrowMainPage/TreeGrowMainPage";
import MissionListPage from "./pages/MissionListPage/MissionListPage";

/*
import UpdateMyInfo from "./components/mypage/UpdateMyInfo";
import MyBoard from "./components/mypage/MyBoard";
import MyLikeBoard from "./components/mypage/MyLikeBoard";
import MemberTip from "./components/mypage/MemberTip";
import LeaveMember from "./components/mypage/LeaveMember";
import MyPoint from "./components/mypage/MyPoint";
import ChangePw from "./components/mypage/ChangePw";
import Mypage from "./pages/member/MyPage";
import PurchaseHistory from "./components/mypage/PurchaseHistory";
import SaleHistory from "./components/mypage/SaleHistory";
import PurchaseDetail from "./components/mypage/PurchaseDetail";
import SaleDetail from "./components/mypage/SaleDetail";
*/
import AdminPage from "./pages/admin/AdminPage";

import UpdateMyInfo from "./components/mypage/UpdateMyInfo";
import Mypage from "./pages/member/MyPage";
import Login from "./pages/member/LoginPage";
import FindId from "./pages/member/FindId";
import FindPw from "./pages/member/FindPw";
import ResetPw from "./pages/member/ResetPw";
import MapCommunityPage from "./pages/MapCommunityPage/MapCommunityPage";
import CampaignMainPage from "./pages/campaign/CampaignMainPage";
import CampaignDetailPage from "./pages/campaign/CampaignDetailPage";
import CreateCampaignPage from "./pages/campaign/CreateCampaignPage";
import CampaignManagerPage from "./pages/campaign/CampaignManagerPage";
import CampaignMemoWritePage from "./pages/campaign/CampaignMemoWritePage";
import CampaignUpdateDeletePage from "./pages/campaign/CampaignUpdateDeletePage";
import PointForGoodPage from "./pages/pointadmin/PointForGoodPage";
import CampaignNotice from "./pages/campaign/CampaignNoticePage";
import Swal from "sweetalert2";
import CampaignNoticeDetailPage from "./pages/campaign/CampaignNoticeDetailPage";

function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin"); // 현재 url이 /admin 으로 시작하면 true 반환
  const { memberGrade } = useAuthStore();
  {
    /*1. 로그인로직 
    2. 로그인 후 null이 아닌 memeber state를 useAthsore에 저장*/
  }

  // useAuthstore로 token가져오기
  //왜 로그인이 아닌 app에서 로그인 인증 유지과정 로직을 적는가?
  // 로그인에서는 로그인을 했을 경우에만 해당. 그 외에는 적용이 어려움
  //app는 새로고침을 해도 모든 창에 기본적으로 영향을 끼침.
  //따라서 app에서 토큰을 지속적으로 유지하는 로직을 짬.

  //app는 새로고침을 해도 모든 창에 기본적으로 영향을 끼침.
  //따라서 app에서 토큰을 지속적으로 유지하는 로직을 짬.
  //다만 아래 로직은 Zustand 메모리 상태에 토큰이 존재할 때만 Axios 헤더를 설정하기 때문에, 새로고침 시 Zustand 상태가 초기화되어 토큰이 사라지는 문제가 있음.

  const token = useAuthStore((state) => state.token);

  //새로고침을 할 떄마다 Axios 헤더 셋팅 -> 즉, 로그인이 풀리지 않게 토큰 유지
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log("새로고침 후 Axios 헤더 세팅 완료", token);
    } else {
      delete axios.defaults.headers.common["Authorization"];
      console.log("Axios Authorization 헤더 제거 완료");
    }
  }, [token]);

  // 403 locked interceptor
  useEffect(() => {
    // 모든 axios 응답이 여기 거치고 감 / 정상응답은 그냥 보내고 403이고 locked: true면 로그아웃 + 로그인페이지로 팅겨냄
    const interceptor = axios.interceptors.response.use(
      // 정상 응답이면 그냥 통과
      (response) => response,
      // 에러 응답이면 아래로 들어감
      (error) => {
        // 에러 응답 코드가 403이고 응답 데이터에 locked: true가 있는 경우에만 ?.은 옵셔널 체이닝 null이여도 안터지고 undefined로 빠짐
        // 옵셔널 체이닝 없으면 data가 null인 상태에서 .으로 추가접근 > null에 접근 터짐
        if (error.response.status === 403 && error.response.data?.locked) {
          Swal.fire({
            icon: "error",
            title: "계정이 정지되었습니다.",
            text: "로그인페이지로 이동합니다.",
            timer: 5000,
          }).then(() => {
            useAuthStore.getState().logout();
            window.location.href = "/members/login";
          });
        } else if (
          error.response.status === 403 &&
          error.response.data === "AdminOnly"
        ) {
          Swal.fire({
            icon: "error",
            title: "백엔드 AdminInterceptor에서 차단되었습니다.",
            text: "관리자 권한이 없는 계정은 관리자 API에 접근할 수 없습니다.",
          }).then(() => {
            window.location.href = "/";
          });
        }
        return Promise.reject(error); // locked를 제외한 다른 오류는 각자 axios catch에 돌려줌
      },
    );

    // 컴포넌트 언마운트 시 인터셉터 제거 (중복 방지)
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  return (
    <div className="carbonconnect wrap">
      {!isAdmin && <Header />}{" "}
      {/* isAdmin이 true면 헤더 컴포넌트 실행 안함 (푸터도 동일)*/}
      <main className={isAdmin ? "" : "main"}>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/mypage/*" element={<Mypage />} />
          <Route path="/store" element={<Store />} />
          <Route path="/store/register" element={<ProductRegistration />} />
          <Route path="/store/:id" element={<StoreDetail />} />
          <Route path="/payment/order" element={<OrderPage />} />
          <Route path="/payment/test" element={<TossTestPayment />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/fail" element={<PaymentFail />} />
          <Route path="/Store" element={<Navigate to="/store" replace />} />
          <Route path="/join" element={<JoinPage />}></Route>
          <Route path="/members/login" element={<Login />}></Route>
          <Route path="/members/find-id" element={<FindId />}></Route>
          <Route path="/members/find-pw" element={<FindPw />}></Route>
          <Route path="/members/reset-pw" element={<ResetPw />}></Route>
          <Route path="/map-community" element={<MapCommunity />} />
          <Route path="/tree-grow" element={<TreeGrowMainPage />} />
          <Route path="/mission" element={<MissionListPage />} />
          <Route path="/community" element={<MapCommunityPage />} />

          <Route
            path="/admin/*"
            element={
              memberGrade === 1 ? <AdminPage /> : <Navigate to="/" replace />
            } // 관리자 아니면 메인으로 날리기
          />
          <Route path="/campaign/main" element={<CampaignMainPage />}></Route>
          <Route
            path="/campaign/detail/:campaignNo"
            element={<CampaignDetailPage />}
          ></Route>
          <Route
            path="/campaign/create"
            element={<CreateCampaignPage />}
          ></Route>
          <Route
            path="/campaign/settings/:campaignNo/:createId/*"
            element={<CampaignManagerPage />}
          ></Route>
          <Route
            path="/campaign/memoWrite/:campaignNo"
            element={<CampaignMemoWritePage />}
          />
          <Route
            path="campaign/update/:campaignParticipanceNo/:campaignNo"
            element={<CampaignUpdateDeletePage />}
          ></Route>
          <Route path="/campaign/notice" element={<CampaignNotice />}></Route>
          <Route
            path="/campaign/noticeDetail/:campaignNoticeNo"
            element={<CampaignNoticeDetailPage />}
          ></Route>

          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/support/*" element={<SupportPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />

          <Route path="/point-give/*" element={<PointForGoodPage />}></Route>
        </Routes>
      </main>
      {!isAdmin && <Footer />}
    </div>
  );
}

export default App;
