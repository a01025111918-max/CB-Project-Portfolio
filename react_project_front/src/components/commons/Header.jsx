import styles from "./commons.module.css";
import { Link, useNavigate, NavLink, useLocation } from "react-router-dom";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MailIcon from "@mui/icons-material/Mail";
import SettingsIcon from "@mui/icons-material/Settings";
import Swal from "sweetalert2";

import useAuthStore from "../../store/useAuthStore";
import { normalizeImageUrl } from "../../utils/getImageUrl";
import { useState, useEffect, useRef } from "react";

const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

// memberThumb의 경로를 실제 이미지 URL로 변환하는 함수임.
// - 백엔드에서 내려오는 값이 절대 URL일 수도 있고,
// - /upload/, /board/editor/ 같은 상대 경로 형태일 수도 있으며,
// - 드라이브 경로로 저장된 경우에도 정상적으로 Firebase 또는 백엔드 URL로 변환함.
// - 로컬 정적 경로는 더 이상 백엔드로 직접 서빙하지 않으므로,
//   normalizeImageUrl에서 가능한 경우 Firebase URL로 변경하도록 처리함.
const getImageUrl = (thumb) => normalizeImageUrl(thumb, "member/thumb");
// 로고 이미지는 Vite 정상 로딩을 위해 import 방식으로 참조함.
import logo from "../../assets/logo/logo.svg";
import axios from "axios";
import Alarm from "../alarm/Alarm";

const Header = () => {
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const drawerRef = useRef(null);
  const { memberId, memberNickname, memberThumb, logout, memberGrade } =
    useAuthStore();
  const [alarmMode, setAlarmMode] = useState(false);
  const [newAlarm, setNewAlarm] = useState(false);

  // avatarError는 Header 이미지 로딩 실패 시 기본 아이콘으로 폴백하기 위한 상태임.
  // memberThumb가 있어도 이미지가 깨지면 아이콘으로 바꿔줌.

  //location : 현재 나의 위치가 어느페이지에 있는지를 알려주는 일종의 네비게이션
  const location = useLocation();
  // 로그인페이지의 위치를 지정해주는것
  //로그인페이지에서는 로그인 버튼을 안보이게 하기 위한 설정
  const isLoginPage = location.pathname === "/members/login";

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "정말 로그아웃 하시겠습니까?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "로그아웃",
      cancelButtonText: "취소",
    });

    if (result.isConfirmed) {
      // 백엔드 호출은 useAuthStore.logout()에서 일괄 처리 (타이머만료/인터셉터 경로와 동일)
      logout();
      navigate("/");
    }
  };

  useEffect(() => {
    // 드로어가 열려 있을 때만 밖 클릭 감지함.
    // 밖을 클릭하면 드로어를 닫도록 처리함.
    if (!drawer) return;

    const handleClickOutside = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        setDrawer(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [drawer]);

  useEffect(() => {
    // 페이지 이동이 일어나면 드로어를 자동으로 닫음.
    // 다른 페이지로 이동했을 때 드로어가 그대로 열려 있지 않도록 함.
    setDrawer(false);
    setAlarmMode(false);
  }, [location.pathname]);

  useEffect(() => {
    setAvatarError(false);
  }, [memberThumb]);

  useEffect(() => {
    axios
      .get(`${BACKSERVER}/alarms/newalarm/${memberId}`)
      .then((res) => {
        console.log(res);
        if (res.data > 0) {
          setNewAlarm(true);
          axios
            .patch(`${BACKSERVER}/alarms/newalarm/${memberId}`)
            .then((res) => {})
            .catch((err) => {
              console.log(err);
            });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return (
    <>
      <header className={styles.header}>
        <NavLink to="/" className={styles.logo}>
          {/* import된 로고를 src 속성으로 전달함. 백슬래시 경로 문자열 대신 안정적 로딩을 위해 수정함. */}
          <img src={logo} alt="logo" loading="lazy" decoding="async" />
          <h1>탄소커넥트</h1>
        </NavLink>

        <div className={styles.header_wrap}>
          {!memberId ? (
            <div className={styles.login}>
              <Link to="/members/login">
                {/*로그인이 안됐을 떄 로그인 버튼이 뜨도록 설정 */}
                {!isLoginPage && (
                  <button
                    type="button"
                    className={`btn ${styles.btn} ${styles.inline} ${styles.login_btn}`}
                  >
                    로그인
                  </button>
                )}
              </Link>
            </div>
          ) : (
            <div className={`${styles.profile_bar_wrap}`}>
              {memberGrade === 1 ? (
                <div
                  className={styles.profile_item}
                  onClick={() => navigate("/admin")}
                >
                  {memberThumb && !avatarError ? (
                    <img
                      src={getImageUrl(memberThumb)}
                      alt="프로필"
                      className={styles.profile_image}
                      loading="lazy"
                      decoding="async"
                      onError={() => setAvatarError(true)}
                      onLoad={() => setAvatarError(false)}
                    />
                  ) : (
                    <AccountCircleIcon
                      sx={{ fontSize: 30, color: "#464d3e" }}
                    />
                  )}
                  <span>{memberNickname}</span>
                </div>
              ) : (
                <div
                  className={`${styles.profile_item} ${drawer ? styles.drawer_open : styles.drawer_close}`}
                  onClick={() => {
                    setAlarmMode(false);
                    setDrawer((prev) => !prev);
                  }}
                >
                  {memberThumb && !avatarError ? (
                    <img
                      src={getImageUrl(memberThumb)}
                      alt="프로필"
                      className={styles.profile_image}
                      loading="lazy"
                      decoding="async"
                      onError={() => setAvatarError(true)}
                      onLoad={() => setAvatarError(false)}
                    />
                  ) : (
                    <AccountCircleIcon
                      sx={{ fontSize: 30, color: "#464d3e" }}
                    />
                  )}
                  <span>{memberNickname}</span>
                </div>
              )}

              {/*로그인만 됐을 떄에만 아이콘이 뜨도록 설정 */}
              {memberId && (
                <>
                  <div style={{ position: "relative" }}>
                    {newAlarm && (
                      <div
                        style={{
                          position: "absolute",
                          width: "10px",
                          height: "10px",
                          left: "62%",
                          top: "15%",
                          backgroundColor: "red",
                          borderRadius: "50%",
                        }}
                      ></div>
                    )}
                    <NotificationsIcon
                      sx={{
                        fontSize: 30,
                        color: "#464d3e",
                        marginTop: 0.5,
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setDrawer(false);
                        setNewAlarm(false);
                        setAlarmMode((prev) => !prev);
                      }}
                    />
                    {alarmMode ? <Alarm /> : null}
                  </div>
                </>
              )}

              {/*memberId가 있을 경우에는 즉 로그인이 되어 있을 경우에는 로그아웃 버튼 활성화x */}
              {memberId && (
                <button
                  onClick={handleLogout}
                  className={`${styles.btn} ${styles.outline}`}
                >
                  로그아웃
                </button>
              )}

              {/* <button
                onClick={() => setDrawer((prev) => !prev)}
                className={`${styles.btn} ${styles.outline}`}
                aria-expanded={drawer}
                aria-controls="header-drawer"
              >
                메뉴 열기
              </button> */}
              {memberId && (
                <div
                  id="header-drawer"
                  className={`${styles.header_drawer} ${drawer ? styles.drawer_open : ""}`}
                  ref={drawerRef}
                >
                  <div className={styles.drawer_menu}>
                    <NavLink
                      to="/mypage/updateMyInfo"
                      className={({ isActive }) =>
                        isActive
                          ? styles.drawer_link_active
                          : styles.drawer_link
                      }
                      onClick={() => setDrawer(false)}
                    >
                      내 정보
                    </NavLink>
                    <NavLink
                      to="/mypage/changePw"
                      className={({ isActive }) =>
                        isActive
                          ? styles.drawer_link_active
                          : styles.drawer_link
                      }
                      onClick={() => setDrawer(false)}
                    >
                      비밀번호 변경
                    </NavLink>
                    <NavLink
                      to="/mypage/myBoard"
                      className={({ isActive }) =>
                        isActive
                          ? styles.drawer_link_active
                          : styles.drawer_link
                      }
                      onClick={() => setDrawer(false)}
                    >
                      내 게시판
                    </NavLink>
                    <NavLink
                      to="/mypage/myLikeBoard"
                      className={({ isActive }) =>
                        isActive
                          ? styles.drawer_link_active
                          : styles.drawer_link
                      }
                      onClick={() => setDrawer(false)}
                    >
                      좋아요누른 게시판
                    </NavLink>
                    <NavLink
                      to="/mypage/tipScrap"
                      className={({ isActive }) =>
                        isActive
                          ? styles.drawer_link_active
                          : styles.drawer_link
                      }
                      onClick={() => setDrawer(false)}
                    >
                      팁 스크랩
                    </NavLink>
                    <NavLink
                      to="/mypage/leaveMember"
                      className={({ isActive }) =>
                        isActive
                          ? styles.drawer_link_active
                          : styles.drawer_link
                      }
                      onClick={() => setDrawer(false)}
                    >
                      회원 탈퇴
                    </NavLink>
                    <NavLink
                      to="/mypage/myPoint"
                      className={({ isActive }) =>
                        isActive
                          ? styles.drawer_link_active
                          : styles.drawer_link
                      }
                      onClick={() => setDrawer(false)}
                    >
                      내 포인트
                    </NavLink>
                    <NavLink
                      to="/mypage/cart"
                      className={({ isActive }) =>
                        isActive
                          ? styles.drawer_link_active
                          : styles.drawer_link
                      }
                      onClick={() => setDrawer(false)}
                    >
                      찜한 상품
                    </NavLink>
                    <NavLink
                      to="/mypage/history/purchase"
                      className={({ isActive }) =>
                        isActive
                          ? styles.drawer_link_active
                          : styles.drawer_link
                      }
                      onClick={() => setDrawer(false)}
                    >
                      구매내역
                    </NavLink>
                    <NavLink
                      to="/mypage/history/sale"
                      className={({ isActive }) =>
                        isActive
                          ? styles.drawer_link_active
                          : styles.drawer_link
                      }
                      onClick={() => setDrawer(false)}
                    >
                      판매내역
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
