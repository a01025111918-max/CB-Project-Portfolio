// 서비스 메인 화면 기능임.
// 실시간 댓글, 중고거래 요약 리스트, 메뉴 등 메인 대시보드 UI를 렌더링함.
//  - 중고거래 리스트: 조회수 기준 상위 판매중 상품 10개를 보여줌.
//  - 실시간 댓글: 최신 리뷰 30개를 순서대로 보여줌.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import HelpIcon from "@mui/icons-material/Help";
import useAuthStore from "../store/useAuthStore";
import Map from "../components/mainpage/Map";
import Bestpostlist from "../components/mainpage/Bestpostlist";
import HorizontalScrollList from "../components/commons/HorizontalScrollList";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import Swal from "sweetalert2";
import RankList from "../components/mainpage/RankList";
import { normalizeImageUrl } from "../utils/getImageUrl";
import { Swiper, SwiperSlide } from "swiper/react";
// import { AutoPlay, EffectFade } from "swiper/modules";
import { Autoplay, EffectFade } from "swiper/modules";

import "swiper/css";
import "swiper/css/effect-fade";
const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

const getSaleStatusLabel = (productStatus) => {
  if (
    productStatus === "예약중" ||
    productStatus === 1 ||
    productStatus === "1"
  )
    return "예약중";
  if (
    productStatus === "판매완료" ||
    productStatus === 2 ||
    productStatus === "2"
  )
    return "판매완료";
  return "판매중";
};

const getImageUrl = normalizeImageUrl;

const getDisplayName = (item) => {
  const name =
    item?.writerNickname?.trim() ||
    item?.memberNickname?.trim() ||
    item?.writerName?.trim() ||
    item?.memberName?.trim();
  if (!name || ["null", "undefined"].includes(name.toLowerCase())) {
    return (
      item?.writerId || item?.memberId || item?.buyerId || item?.sellerId || ""
    );
  }
  return name;
};

const Main = () => {
  // 실시간 댓글 "보여지는 영역" DOM
  const realtimeViewportRef = useRef(null);
  // 실시간 댓글 "실제 텍스트" DOM
  const realtimeTextRef = useRef(null);
  // 중고거래 API 데이터
  const [goods, setGoods] = useState([]);

  const navigate = useNavigate();
  const { memberId } = useAuthStore();
  const isLogin = !!memberId;

  const getBoardNo = (board) => {
    return board?.boardNo ?? board?.boardId ?? board?.id ?? null;
  };

  const getRealtimeCommentLink = (comment) => {
    if (!comment) return null;
    if (comment.marketNo) return `/store/${comment.marketNo}`;
    return null;
  };

  const handleRealtimeCommentClick = () => {
    const targetLink = getRealtimeCommentLink(visibleRealtimeComment);
    if (targetLink) {
      navigate(targetLink);
    }
  };

  //랜덤 미션 패널
  const [todayRandomMission, setTodayRandomMission] = useState(null);
  const [showMissionBubble, setShowMissionBubble] = useState(false);
  const [randomMissionCompleted, setRandomMissionCompleted] = useState(false);

  useEffect(() => {
    axios
      .get(`${BACKSERVER}/api/store/boards`)
      .then((res) => {
        const items = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
            ? res.data.items
            : [];
        setGoods(items);
      })
      .catch((err) => console.error("중고장터 목록 조회 실패", err));
  }, []);

  // 중고거래 리스트 기능임. 조회수 기준 상위 판매중 상품 10개를 화면에 보여줌.
  //  - 서버에서 받은 상품 중 판매중인 것만 필터링함.
  //  - 정렬 후 최대 10개만 화면에 노출함.
  const usedGoods = useMemo(() => {
    return goods
      .filter((item) => getSaleStatusLabel(item.productStatus) === "판매중")
      .sort((a, b) => (b.readCount || 0) - (a.readCount || 0))
      .slice(0, 10);
  }, [goods]);

  // 실시간 댓글 리스트 기능임. 최신 리뷰 30개를 API에서 가져와서 화면에 보여줌.
  //  - 화면에 한 개씩 표시하고 20초마다 다음 댓글로 전환함.
  //  - 긴 텍스트는 자동 스크롤 애니메이션 처리함.
  const [realtimeComments, setRealtimeComments] = useState([]);
  const [tipBoards, setTipBoards] = useState([]);
  const [tipIndex, setTipIndex] = useState(0);
  // 팁 리스트는 초보자도 참고할 수 있는 꿀팁 모음임.
  //  - 메인 화면에서 자동으로 한 개씩 보여주고, 클릭하면 해당 팁 상세로 이동함.

  useEffect(() => {
    axios
      .get(`${BACKSERVER}/api/store/reviews/latest?limit=30`)
      .then((res) =>
        setRealtimeComments(Array.isArray(res.data) ? res.data : []),
      )
      .catch((err) => console.error("실시간 댓글 조회 실패", err));

    axios
      .get(`${BACKSERVER}/boards/tips/list`)
      .then((res) => setTipBoards(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error("팁 리스트 조회 실패", err));
  }, []);

  // 화면에 현재 보여줄 댓글 1개
  // 초기값은 댓글 목록에서 랜덤으로 선택
  const [visibleRealtimeComment, setVisibleRealtimeComment] = useState(() => {
    if (!realtimeComments.length) return null;
    return realtimeComments[
      Math.floor(Math.random() * realtimeComments.length)
    ];
  });

  useEffect(() => {
    if (!tipBoards.length) return;

    let idx = Math.floor(Math.random() * tipBoards.length);
    setTipIndex(idx);

    const interval = setInterval(() => {
      idx = (idx + 1) % tipBoards.length;
      setTipIndex(idx);
    }, 5000);

    return () => clearInterval(interval);
  }, [tipBoards]);

  // 텍스트를 왼쪽으로 이동시키기 위한 x축 값(px)
  const [realtimeOffset, setRealtimeOffset] = useState(0);
  // 이동 애니메이션 문자열 (예: transform 5s linear)
  const [realtimeTransition, setRealtimeTransition] = useState("none");

  // 20초마다 댓글 1개를 랜덤으로 교체
  // 댓글 목록이 로드되면 20초마다 순서대로 교체
  useEffect(() => {
    if (!realtimeComments.length) return;
    let idx = 0;
    setVisibleRealtimeComment(realtimeComments[0]);
    // 실시간 댓글을 5초마다 바꿔서 보여주는 로직임.
    // visibleRealtimeComment 상태가 새로운 댓글로 변경되면 화면에서 재렌더링됨.
    const timer = setInterval(() => {
      idx = (idx + 1) % realtimeComments.length;
      setVisibleRealtimeComment(realtimeComments[idx]);
    }, 5000);
    return () => clearInterval(timer);
  }, [realtimeComments]);

  // 댓글이 바뀔 때마다 "한 줄 자동 스크롤" 애니메이션 재설정
  useEffect(() => {
    if (!visibleRealtimeComment) return;
    if (!realtimeViewportRef.current || !realtimeTextRef.current) return;

    // 보여지는 박스 너비 / 실제 텍스트 너비
    const viewportWidth = realtimeViewportRef.current.clientWidth;
    const textWidth = realtimeTextRef.current.scrollWidth;
    // 텍스트가 얼마나 넘치는지 계산
    const overflowWidth = textWidth - viewportWidth;

    // 시작 상태: 왼쪽 처음 위치, 애니메이션 없음
    setRealtimeTransition("none");
    setRealtimeOffset(0);

    // 넘치지 않으면 이동할 필요 없음
    if (overflowWidth <= 0) return;

    // 넘친 길이에 따라 이동 속도를 자동 계산
    // 너무 느리거나 빠르지 않게 최소/최대 시간 제한
    const moveDuration = Math.min(Math.max(overflowWidth / 35, 4), 14);
    const moveDelay = 200;
    const holdDuration = 3000;
    const resetDuration = 500;
    const restartDelay = 200;
    const timers = [];

    // 1사이클: 이동 -> 끝에서 잠깐 대기 -> 처음으로 복귀 -> 다시 반복
    const startCycle = () => {
      // (1) 텍스트를 왼쪽으로 이동
      const moveTimer = setTimeout(() => {
        setRealtimeTransition(`transform ${moveDuration}s linear`);
        setRealtimeOffset(-overflowWidth);
      }, moveDelay);
      timers.push(moveTimer);

      // (2) 끝까지 이동 후 3초 대기한 뒤 처음 위치로 복귀
      const resetTimer = setTimeout(
        () => {
          setRealtimeTransition(`transform ${resetDuration / 1000}s ease`);
          setRealtimeOffset(0);
        },
        moveDelay + moveDuration * 1000 + holdDuration,
      );
      timers.push(resetTimer);

      // (3) 복귀 후 약간 쉬고 다시 같은 사이클 반복
      const nextCycleTimer = setTimeout(
        () => {
          setRealtimeTransition("none");
          startCycle();
        },
        moveDelay +
          moveDuration * 1000 +
          holdDuration +
          resetDuration +
          restartDelay,
      );
      timers.push(nextCycleTimer);
    };

    startCycle();

    return () => {
      // 댓글 변경/언마운트 시 기존 타이머 정리(메모리 누수 방지)
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [visibleRealtimeComment]);

  //랜덤 미션 패널
  useEffect(() => {
    if (!isLogin) return;

    let timer;

    const fetchRandomMissionBubble = async () => {
      try {
        // 1. 오늘의 랜덤 미션 조회
        const missionRes = await axios.get(`${BACKSERVER}/missions/random`, {
          params: { memberId },
        });

        if (!missionRes.data) return;

        const mission = missionRes.data;
        setTodayRandomMission(mission);

        // 2. 오늘 랜덤 미션 완료 여부 조회
        const completedRes = await axios.get(
          `${BACKSERVER}/missions/random/today/completed`,
          {
            params: {
              memberId,
              missionNo: mission.missionNo,
            },
          },
        );

        const completed = completedRes.data.completed === true;
        setRandomMissionCompleted(completed);

        // 3. 이미 완료했으면 안 띄움
        if (completed) {
          setShowMissionBubble(false);
          return;
        }

        // 4. 오늘 이미 한 번 띄운 적 있으면 안 띄움
        const today = new Date().toISOString().slice(0, 10);
        const missionPopupKey = `randomMissionPopup_${memberId}_${today}`;

        if (localStorage.getItem(missionPopupKey) === "shown") {
          setShowMissionBubble(false);
          return;
        }

        // 5. 처음 보는 경우만 5초간 노출
        setShowMissionBubble(true);
        localStorage.setItem(missionPopupKey, "shown");

        timer = setTimeout(() => {
          setShowMissionBubble(false);
        }, 3500);
      } catch (err) {
        console.error("오늘의 랜덤 미션 패널 처리 실패", err);
      }
    };

    fetchRandomMissionBubble();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLogin, memberId]);

  //미션버튼 클릭-> 로그인으로 이동
  const handleMissionClick = async () => {
    if (!isLogin) {
      const result = await Swal.fire({
        icon: "warning",
        title: "로그인이 필요합니다",
        text: "미션(출석체크)은 로그인 후 이용할 수 있습니다. 로그인 페이지로 이동하시겠습니까?",
        showCancelButton: true,
        confirmButtonText: "로그인",
        cancelButtonText: "취소",
        confirmButtonColor: "#464d3e",
        cancelButtonColor: "#b0b0b0",
      });

      if (result.isConfirmed) {
        navigate("/members/login", { state: { from: "/mission" } });
      }
      return;
    }

    navigate("/mission");
  };

  // 캠페인 정보 불러오는 곳
  const [campList, setCampList] = useState([]);
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKSERVER}/campaigns/selectFrontCamp`)
      .then((res) => {
        console.log(res);
        setCampList([...res.data]);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return (
    <main className="main_wrap">
      <div className="main_top">
        <div className="main_nav">
          <div className="menu_bar">
            <span>메뉴</span>
          </div>
          <ul>
            <li>
              <Link to="map-community">맵 커뮤니티</Link>
            </li>
            <li>
              <Link to="/campaign/main">회원끼리 캠페인</Link>
            </li>
            <li>
              <Link to="/store">중고거래</Link>
            </li>
            <li>
              <Link
                to="/mission"
                onClick={(e) => {
                  if (!isLogin) {
                    e.preventDefault(); // 이동 막기
                    handleMissionClick();
                  }
                }}
              >
                미션(출석체크)
              </Link>
            </li>
            <li>
              <Link to="/tree-grow" className="treeGrow">
                나무 키우기
              </Link>
            </li>
            {/*포인트 나눔 새로 추가 */}
            <li>
              <Link to="/point-give">포인트 나눔</Link>
            </li>

            <li>
              <span>
                <hr />
              </span>
            </li>

            <li>
              <Link to="/support/notice">공지사항</Link>
            </li>
          </ul>
          <div className="main_quest_wrap">
            <span>
              <p>고객센터</p>
              <p>
                <HelpIcon />
              </p>
            </span>
            <p>고객센터 운영시간</p>
            <p>10:00 ~ 18:00</p>
            <button className="btn" onClick={() => navigate("/support")}>
              문의하기 ▶
            </button>
          </div>
        </div>

        <div className="main_map roundBorder">
          {/* <p>Map</p> */}
          {/*위치설명*/}
          <Map />
        </div>

        <div className="main_content_one">
          <div className="best_list roundBorder">
            {/* <p>인기게시글</p> */}
            {/*위치설명*/}
            <Bestpostlist className="bestpostlist" />
          </div>
          <div className="tip_list roundBorder">
            <p>팁 리스트</p>
            {tipBoards.length > 0 ? (
              <div
                className="tip_item"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  /*
                    팁 리스트 클릭 이동 로직임.
                    1) tipBoards 배열에서 현재 보이는 tipIndex의 게시물 정보를 가져옴.
                    2) getBoardNo()는 boardNo, boardId, id 등 여러 후보 값을 확인함.
                    3) boardNo가 유효하면 /map-community 페이지에 쿼리 파라미터로 전달해서
                       해당 게시물 상세를 보여주도록 함.
                    4) boardNo가 없으면 상세 페이지를 열 수 없으므로 맵 커뮤니티 메인으로 이동함.
                  */
                  const boardNo = getBoardNo(tipBoards[tipIndex]);
                  if (boardNo) {
                    navigate(`/map-community?boardNo=${boardNo}`);
                  } else {
                    navigate("/map-community");
                  }
                }}
              >
                <div className="tip_title">
                  {tipBoards[tipIndex]?.boardTitle || "제목 정보 없음"}
                </div>
                <div className="tip_author">
                  {getDisplayName(tipBoards[tipIndex]) || "작성자 정보 없음"}
                </div>
                <div className="tip_date">
                  {tipBoards[tipIndex]?.boardDate
                    ? new Date(
                        tipBoards[tipIndex].boardDate,
                      ).toLocaleDateString("ko-KR")
                    : "날짜 정보 없음"}
                </div>
              </div>
            ) : (
              <div className="tip_empty">스크랩된 팁이 없습니다.</div>
            )}
          </div>
        </div>

        <div className="main_content_two">
          <div className="campaign_zone roundBorder">
            <h4>인기 캠페인</h4>
            <Swiper
              modules={[Autoplay, EffectFade]}
              loop={campList.length > 1} //한번 순환후에 계속 돌건지 여부(false면 안돔)
              effect="fade"
              fadeEffect={{ crossFade: true }} //direction이 vertical일때는 사용 불가(애니메이션은 horizontal만 구현)
              autoplay={{
                delay: 5000, //몇밀리초마다
                disableOnInteraction: false, //사용자가 건드려도 계속 돌아감(true 면 멈춤)
                pauseOnMouseEnter: true, //마우스 들어가면 정지
              }}
              slidesPerView={1} //swiper하나당 몇개 보여줄지
              // style={{ height: "40px" }}
              //onSlideChange={() => console.log("slide change")} //slide 한번 할때마다 작동(그행위시마다)
              speed={1250} //넘어가는 시간
            >
              {campList.map((camp, index) => {
                return (
                  <SwiperSlide
                    key={camp.campaignTitle + index}
                    onClick={() => {
                      navigate(`/campaign/detail/${camp.campaignNo}`);
                    }}
                  >
                    <div className="camp_swiper_wrap">
                      <div className="camp_swiper_title">
                        <h4>{camp.campaignTitle}</h4>
                      </div>
                      <div>
                        {"참여달성 : " +
                          Math.ceil(
                            (camp.memberCount / camp.campaignGoalMember) * 100,
                          ) +
                          "%"}
                      </div>
                      <div>{"주최자 : " + camp.memberId}</div>
                      <div>
                        {"종료일 : " +
                          new Date(camp.campaignExpireDate).toLocaleDateString(
                            "kr-KR",
                          )}
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </div>

          <div
            className="realtime_comment roundBorder"
            onClick={handleRealtimeCommentClick}
            style={{
              cursor:
                visibleRealtimeComment && visibleRealtimeComment.marketNo
                  ? "pointer"
                  : "default",
            }}
          >
            <div
              className="realtime_comment_viewport"
              ref={realtimeViewportRef}
            >
              <p
                className="realtime_comment_line"
                ref={realtimeTextRef}
                style={{
                  transform: `translateX(${realtimeOffset}px)`,
                  transition: realtimeTransition,
                }}
              >
                {visibleRealtimeComment
                  ? `${getDisplayName(visibleRealtimeComment)} : ${visibleRealtimeComment.reviewContent}`
                  : "실시간 댓글이 없습니다."}
              </p>
            </div>
          </div>

          <div className="rank_list roundBorder">
            {/* <p>랭킹 리스트</p> */}
            <RankList />
          </div>
        </div>
        {/*랜덤 미션*/}
        {showMissionBubble && todayRandomMission && !randomMissionCompleted && (
          <div className="floating_mission_box" onClick={handleMissionClick}>
            <div className="floating_mission_icon">
              <ConfirmationNumberIcon />
            </div>
            <span>랜덤 미션</span>
          </div>
        )}
      </div>

      <div className="main_btm">
        <div className="used_list roundBorder">
          <HorizontalScrollList
            scrollClassName="used_list_scroll"
            showButtons={false}
          >
            <ul>
              {usedGoods.map((item, index) => {
                const imageUrl = getImageUrl(item.productThumb);
                return (
                  <li key={item.marketNo ?? item.boardNo ?? index}>
                    <Link to={`/store/${item.marketNo}`}>
                      <div className="used_item_image" aria-hidden="true">
                        <div className="used_item_image" aria-hidden="true">
                          <img
                            loading="lazy"
                            decoding="async"
                            src={imageUrl || "/no-image.svg"}
                            alt={item.marketTitle || "상품 이미지"}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/no-image.svg";
                            }}
                          />
                        </div>
                      </div>
                      <div className="used_item_info">
                        <strong>
                          [{getSaleStatusLabel(item.productStatus)}]{" "}
                          {item.marketTitle}
                        </strong>
                        <p className="used_item_price">
                          {item.productPrice
                            ? `${Number(item.productPrice).toLocaleString("ko-KR")}원`
                            : ""}
                        </p>
                        <div className="used_item_meta">
                          <span>{getDisplayName(item)}</span>
                          <span>|</span>
                          <span>💬 {item.commentCount ?? 0}</span>
                          <span>|</span>
                          <span>
                            {item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString(
                                  "ko-KR",
                                )
                              : ""}
                          </span>
                        </div>
                        <span className="used_item_view">
                          👀{" "}
                          {Number(item.readCount ?? 0).toLocaleString("ko-KR")}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </HorizontalScrollList>
        </div>
      </div>
    </main>
  );
};

export default Main;
