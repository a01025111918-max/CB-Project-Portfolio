/* eslint-disable no-constant-binary-expression */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
/* eslint-disable react/react-in-jsx-scope */
import { useEffect, useRef, useState } from "react";
import Community from "../../components/board/Community/Community";
import styles from "./MapCommunityPage.module.css";
import defaultImg from "../../assets/img/defaultImg.png";
import borderPin from "../../assets/img/borderPin.svg";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CelebrationOutlinedIcon from "@mui/icons-material/CelebrationOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import heart from "../../assets/img/heart.svg";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { normalizeImageUrl } from "../../utils/getImageUrl";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
// import { REGION_DATA } from "../../components/board/Community/regionData";

// 백엔드 API 서버 주소를 환경 변수에서 읽어오고, 없으면 로컬 주소를 기본값으로 사용함.
// 프론트엔드와 백엔드가 분리되어 있어도 환경별로 주소를 쉽게 바꾸기 위함임.
const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

// 이미지 URL 정규화 도구를 가져와서 마커 이미지나 사용자 썸네일을 올바른 경로로 변환함.
const getImageUrl = normalizeImageUrl;

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const MapCommunityPage = () => {
  const [sido, setSido] = useState("");
  const [sigungu, setSigungu] = useState("");
  const [addr, setAddr] = useState("서울특별시 중구");
  const [lnglat, setLnglat] = useState({
    lat: 37.5665 - 0.001,
    lng: 126.978,
  });
  const [ctpvsgg, setCtpvsgg] = useState({
    ctpv: "서울특별시",
    sgg: "중구",
  });

  return (
    <div className={styles.mapCommunityPage}>
      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.mapBox}>
            <Map
              sido={sido}
              setSido={setSido}
              sigungu={sigungu}
              setSigungu={setSigungu}
              addr={addr}
              lnglat={lnglat}
              ctpvsgg={ctpvsgg}
              setAddr={setAddr}
              setLnglat={setLnglat}
              setCtpvsgg={setCtpvsgg}
            />
          </div>
        </div>

        <div className={styles.right}>
          <Community
            sido={sido}
            setSido={setSido}
            sigungu={sigungu}
            setSigungu={setSigungu}
            addr={addr}
            lnglat={lnglat}
            ctpvsgg={ctpvsgg}
            setAddr={setAddr}
            setLnglat={setLnglat}
            setCtpvsgg={setCtpvsgg}
          />
        </div>
      </div>
    </div>
  );
};

const Map = ({
  addr,
  lnglat,
  ctpvsgg,
  setAddr,
  setLnglat,
  setCtpvsgg,
  sido,
  setSido,
  sigungu,
  setSigungu,
}) => {
  // const [detailMode, setDetailMode] = useState(false);
  const navigate = useNavigate();
  const mapDivRef = useRef(null);
  // 지역별 게시글 통계 목록을 저장함.
  // 이 값은 선택된 시도/시군구의 게시물 수를 계산하는 데 사용됨.
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const tooltipRef = useRef(null);
  const [ctpvsggList, setCtpvsggList] = useState([]);
  // 지도에 표시할 게시글 마커 데이터를 저장함.
  const [markerList, setMarkerList] = useState([]);
  // 전체 회원 통계에서 가져온 총 절감 탄소량을 저장함.
  // 이 값은 메인 통계 영역에서 참고용으로 보여주는 값임.
  const [totalCo2, setTotalCo2] = useState(0);
  // 선택한 지역의 실제 탄소 배출량을 DB에서 가져와서 저장함.
  // 이 값은 지역별 차트 아래에 표시되는 실제 배출량 수치임.
  // 백엔드 API는 해당 지역의 최신 공공 데이터 기반 배출량을 계산해서 넘겨줌.
  const [actualCo2, setActualCo2] = useState(0);
  // 지역 탄소 배출 변화를 그리기 위한 차트 데이터 상태임.
  // labels와 datasets를 포함한 Chart.js 데이터 구조를 저장함.
  const [regionChartData, setRegionChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  // 지역 탄소 배출 변화 차트 표시 여부를 관리함.
  // 사용자가 지도를 클릭하면 지역만 선택되고, 차트는 마커 내부 버튼을 눌러서 표시함.
  const [showRegionChart, setShowRegionChart] = useState(false);
  // 전역에서 차트 열기 함수를 호출할 수 있게 등록함.
  useEffect(() => {
    window.openRegionChart = () => setShowRegionChart(true);
    return () => {
      if (window.openRegionChart) delete window.openRegionChart;
    };
  }, []);
  // 현재 선택된 지역을 기억하기 위한 ref임.
  // 같은 구를 다시 클릭했을 때도 이전 선택을 유지하려고 사용함.
  const selectedRegionRef = useRef(ctpvsgg);

  // 지역 선택 상태를 업데이트하는 함수임.
  // 같은 구를 다시 클릭하면 ctpvsgg 상태를 다시 변경하지 않아서
  // 차트가 새로 갱신되는 것을 막음.
  const updateSelectedRegion = ({ ctpv, sgg, addr, lat, lng }) => {
    const isSameRegion =
      selectedRegionRef.current?.ctpv === ctpv &&
      selectedRegionRef.current?.sgg === sgg;

    // 다른 구를 선택했을 때만 상태를 변경함.
    if (!isSameRegion) {
      setCtpvsgg({ ctpv, sgg });
      selectedRegionRef.current = { ctpv, sgg };
    }

    // 주소와 좌표는 항상 화면에 표시하기 위해 업데이트함.
    if (addr) setAddr(addr);
    if (lat && lng) setLnglat({ lat, lng });

    // 지역을 선택하면 차트는 기본으로 숨김 상태로 유지.
    setShowRegionChart(false);
  };

  let mapMarkerList = [];
  let mapaddr = "서울특별시 중구";
  let maplnglat = {
    lat: 37.5665 - 0.001,
    lng: 126.978,
  };
  let mapctpvsgg = {
    ctpv: "서울특별시",
    sgg: "중구",
  };
  let detailMode = false;
  let ctpvsgglength = 0;

  const boardView = (boardNo, addr, ctpv, sgg) => {
    if (boardNo) {
      navigate(`/map-community?boardNo=${boardNo}`);
      setAddr(addr);
      setCtpvsgg({ ctpv: ctpv, sgg: sgg });
      setSido(ctpv);
      setSigungu(sgg);
    } else {
      navigate("/map-community");
    }
  };

  useEffect(() => {
    // 지도에 표시할 게시물 마커를 백엔드에서 가져오는 API 호출임.
    // 마커 위치는 게시글의 위도/경도로 표시하기 위해 필요함.
    axios
      .get(`${import.meta.env.VITE_BACKSERVER}/boards/markers`)
      .then((res) => {
        console.log("마커 데이터 로드 성공:", res.data);
        setMarkerList(res.data);
      })
      .catch((err) => {
        console.error("마커 데이터 로드 실패:", err);
      });

    // 지역별 게시글 개수 통계를 가져오는 API 호출임.
    // 이 데이터는 선택된 지역의 게시물 수를 기반으로 절감량을 추정하는 데 사용됨.
    axios
      .get(`${BACKSERVER}/boards/boardCount`)
      .then((res) => {
        setCtpvsggList(res.data);
      })
      .catch((err) => {
        console.error("boardCount 데이터 로드 실패:", err);
      });

    // 전체 회원 탄소 통계를 가져오는 API 호출임.
    // 메인 맵 통계 영역에 사용할 수 있도록 총 절감량을 백엔드에서 가져오는 부분임.
    axios
      .get(`${BACKSERVER}/members/stats`)
      .then((res) => {
        setTotalCo2(res.data?.totalCo2 ?? 0);
      })
      .catch((err) => {
        console.error("회원 탄소 통계 로드 실패:", err);
      });
  }, []);

  useEffect(() => {
    // 선택된 지역 정보(ctpv, sgg)가 바뀔 때마다 실제 탄소 배출량을 다시 요청함.
    // 이 API는 백엔드에서 실제 DB의 공공 데이터 기반 탄소 배출량을 계산해서 반환함.
    if (!ctpvsgg.ctpv || !ctpvsgg.sgg) {
      setActualCo2(0);
      setRegionChartData(null);
      setShowRegionChart(false);
      return;
    }

    axios
      .get(
        `${BACKSERVER}/carbon/region?ctpv=${encodeURIComponent(
          ctpvsgg.ctpv,
        )}&sgg=${encodeURIComponent(ctpvsgg.sgg)}`,
      )
      .then((res) => {
        setActualCo2(res.data ?? 0);
      })
      .catch((err) => {
        console.error("지역 탄소 배출량 로드 실패:", err);
        setActualCo2(0);
      });

    const fetchRegionChart = async () => {
      setChartLoading(true);
      try {
        const response = await axios.get(
          `${BACKSERVER}/carbon/region/history`,
          {
            params: {
              ctpv: ctpvsgg.ctpv,
              sgg: ctpvsgg.sgg,
            },
          },
        );
        const history = Array.isArray(response.data) ? response.data : [];
        // period 값은 '2024-01' 형태로 넘어옴.
        // 이 값을 '1월', '2월'처럼 사람이 보기 쉬운 텍스트로 변환함.
        const formatMonthLabel = (period) => {
          const parts = (period || "").split("-");
          if (parts.length !== 2) return period;
          const month = parseInt(parts[1], 10);
          return Number.isNaN(month) ? period : `${month}월`;
        };
        setRegionChartData({
          // 차트의 x축 레이블로 쓰일 값들을 저장함.
          labels: history.map((item) => formatMonthLabel(item.period)),
          datasets: [
            {
              // 라인 차트에 보여줄 데이터 시리즈 이름임.
              label: "월별 탄소 배출량 (kg)",
              // 실제 차트 y값 데이터 배열임.
              data: history.map((item) => item.emission),
              borderColor: "#8fbf5a",
              backgroundColor: "rgba(143, 191, 90, 0.25)",
              tension: 0.3,
              fill: true,
              pointRadius: 4,
              pointHoverRadius: 8,
            },
          ],
        });
      } catch (err) {
        console.error("지역 탄소 차트 로드 실패:", err);
        setRegionChartData(null);
      } finally {
        setChartLoading(false);
      }
    };

    fetchRegionChart();
  }, [ctpvsgg]);
  // console.log("마커 리스트:", markerList);
  mapMarkerList = { ...markerList };
  //console.log("마커 리스트:", markerList);

  useEffect(() => {
    if (!mapElement.current) return;

    // 1. 지도 초기화
    const location = new window.naver.maps.LatLng(
      `${maplnglat.lat}`,
      `${maplnglat.lng}`,
    );
    const mapOptions = {
      center: location,
      zoom: 15,
    };

    const map = new window.naver.maps.Map(mapElement.current, mapOptions);
    mapRef.current = map;

    const tooltip = tooltipRef.current;
    map.getPanes().floatPane.appendChild(tooltip);

    const defaultMarker = new naver.maps.Marker({
      position: new window.naver.maps.LatLng(
        `${maplnglat.lat}`,
        `${maplnglat.lng}`,
      ),
      map: map,
      icon: {
        content:
          '<div style="position: relative; width: 100%; z-index:99999;"><img loading="lazy" decoding="async" src="src/assets/img/marker.png" style="width: 30px; margin: 0px; padding: 0px; border: 0px solid transparent; display: block; min-width: 30px; min-height: none; z-index=99999; -webkit-user-select: none; position: absolute; left: 0px; top: 0px;"></div>',
        size: new naver.maps.Size(22, 35),
        anchor: new naver.maps.Point(11, 35),
      },
    });

    defaultMarker.setTitle("Default Marker");
    defaultMarker.setDraggable(false);

    markerList.map((marker, i) => {
      mapaddr = "선택된 위치 없음";
      const writerAvatar = getImageUrl(marker.memberThumb) || defaultImg;
      const markerSrc = getImageUrl(marker.boardThumb) || defaultImg;
      const markerName = new naver.maps.Marker({
        key: `marker-${i}`,
        position: new window.naver.maps.LatLng(
          `${marker.boardLat}`,
          `${marker.boardLng}`,
        ),
        map: map,
        icon: {
          content: `
          <div>
        <img
        loading="lazy"
        decoding="async"
        src='${marker.memberThumb || defaultImg}'
        style="width: 38px; height: 36px; object-fit: cover; border-radius: 50%;margin: 0px; padding: 0px; z-index:${2 + i}; border: 0px solid transparent; display: block; min-width: 38px; min-height: none; -webkit-user-select: none; position: absolute; left: 0px; top: 0px; transform: translate(15%, 15%);"
        />
        <img
        loading="lazy"
        decoding="async"
        src='src/assets/img/defaultthumbmarker.png'
        style="width: 30px; margin: 0px; padding: 0px; border: 0px solid transparent; display: block; min-width: 50px; min-height: none; -webkit-user-select: none; z-index:${1 + i}; position: absolute; left: 0px; top: 0px;"
        />
      </div>`,
          size: new naver.maps.Size(22, 35),
          anchor: new naver.maps.Point(11, 35),
        },
      });
      markerName.setTitle(marker.boardTitle || "제목 없음" || "Default Marker");
      markerName.setDraggable(false);

      naver.maps.Event.addListener(markerName, "click", (e) => {
        detailMode = !detailMode;
        console.log("marker click");
        e.coord._lat = marker.boardLat;
        e.coord._lng = marker.boardLng;
        naver.maps.Service.reverseGeocode(
          {
            location: e.coord,
          },
          (status, response) => {
            if (status != naver.maps.Service.Status.OK) {
              alert("주소를 찾을 수 없습니다.");
              return;
            }
            const selectedAddr = response.result.items[0].address;
            const selectedCtpv = response.result.items[0].addrdetail.sido;
            const selectedSgg = response.result.items[0].addrdetail.sigugun;
            mapaddr = selectedAddr;
            updateSelectedRegion({
              ctpv: selectedCtpv,
              sgg: selectedSgg,
              addr: selectedAddr,
              lat: marker.boardLat,
              lng: marker.boardLng,
            });
            mapctpvsgg.ctpv = selectedCtpv;
            mapctpvsgg.sgg = selectedSgg;
          },
        );

        console.log(markerName.key);

        if (detailMode) {
          map.setCenter(
            new window.naver.maps.LatLng(
              // 클릭 시 detailMode true일 경우 마커위치를 조금 아래로
              // 고쳐서 마커 정보창이 지도맵 중심에 오도록 하기 위해 lat에 0.003 더함
              markerName.getPosition().lat() + 0.003,
              markerName.getPosition().lng(),
            ),
          );
          map.setZoom(15);
          markerName.setIcon({
            content: `
            <div> // 마커 + 클릭 시 나타나는 오브젝트를 감싼 제일 바깥 태그
              <div style="position: relative; width: 100%;">
                <div
                style="
                  position: absolute;
                  width: 300px;
                  left: 50%;
                  bottom: 50%;
                  transform: translate(-53.5%, -260%);
                  height: max-content;
                  border-radius: 25px;
                  border: var(--border2);
                  z-index: ${5000 + 2};
                  padding: 15px 20px;
                  font-size: 15px;
                  font-weight: 600;
                  text-align: center;
                  background-color: var(--gray8);
                "
                >
                <div>
                  <img
                    loading="lazy"
                    decoding="async"
                    src=${borderPin}
                    style="
                      position: absolute;
                      width: 32px;
                      z-index: ${5000 + 3};
                      bottom: 80%;
                      left: 50%;
                      color: #ff593c;
                    "
                  />
                </div>
                // 위치한 주소를 marker 객체의 addr 필드에서 가져와서 표시
                <p>${marker.addr}</p>
              </div>
              // 위치한 주소를 띄어주는 오브젝트 아래 해당 게시물 작성자,
              // 닉네임, 받은 하트 수, 게시물 제목, 게시물 내용 일부를
              // 띄우는 오브젝트
              <div
                style="
                  position: absolute;
                  left: 50%;
                  bottom: 50%;
                  transform: translate(-53.5%, -10%);
                  margin-top: 60px;
                  width: 300px;
                  height: max-content;
                  border-radius: 25px;
                  border: var(--border2);
                  z-index: ${5000 + 2};
                  padding: 15px 20px;
                  font-size: 15px;
                  font-weight: 600;
                  text-align: center;
                  background-color: var(--gray8);
                  display: flex;
                  flex-direction: column;
                  justify-items: center;
                  align-content: space-between;
                "
                >
                  <div
                    style="
                      display: flex;
                      justify-content: space-between;
                      width: 100%;
                    "
                  >
                    <div
                      style=" display: flex; gap: 8px; align-items: center; "
                    >
                      <img
                        loading="lazy" // 로딩속도를 빠르게 하기 위해 lazy 로딩 적용
                        decoding="async" // 디코딩을 비동기로 처리하기 위함
                        src=${marker.memberThumb || defaultImg}
                        alt=""
                        style="
                          width: 35px;
                          height:35px;
                          z-index: ${5000 + 3};
                          border-radius: 50%;
                          border: var(--border2);
                        "
                      />
                    <p>${marker.memberNickname}</p>
                  </div>
                <div
                  style=" display: flex; gap: 1px; align-items: center; "
                >
                  <img
                    loading="lazy"
                    decoding="async"
                    src=${heart}
                    alt=""
                    style="
                      width: 25px;
                      z-index: ${5000 + 3};
                      border-radius: 50%;
                    "
                  />
                  <p>${marker.likeCount}</p>
                </div>
              </div>
              <div style=" padding: 8px 4px; line-height: 1; ">
                // 게시물 제목을 10자까지만 보여주고, 내용은 30자까지만 보여주기 위함
                <div style=" text-align: left; ">${marker.boardTitle.substring(0, 10)}</div>
                  <div
                    style="
                      width: 100%;
                      padding: 5px 0;
                      font-size: 14px;
                      font-weight: 500;
                      white-space: nowrap;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      text-align: left;
                      z-index=${5000 + 3};
                    "
                  >
                    ${marker.boardContent
                      .replace(/<img[^>]*>/gi, "")
                      .replace(/<[^>]*>?/g, "")
                      .substring(0, 30)}
                  </div>
                </div>
                
              </div>
            </div>
          <div style="position: relative;">
            <img
              loading="lazy"
              decoding="async"
              src=${marker.memberThumb || defaultImg}
              style="width: 38px; height: 36px; object-fit: cover; border-radius: \
              50%;margin: 0px; padding: 0px; z-index:${2 + i}; border: 0px solid \
              transparent; display: block; min-width: 38px; min-height: none; \
              -webkit-user-select: none; position: absolute; left: 0px; top: 0px; \
              transform: translate(15%, 15%);"
            />
            <img
              loading="lazy"
              decoding="async"
              src='src/assets/img/defaultthumbmarker.png'
              style="width: 30px; margin: 0px; padding: 0px; border: 0px solid \
              transparent; display: block; min-width: 50px; min-height: none; \
              -webkit-user-select: none; z-index:${1 + i}; position: absolute; \
              left: 0px; top: 0px;"
            />
          </div>
          <button
                  type="button"
                  onclick="event.stopPropagation(); window.openRegionChart && \
                  window.openRegionChart();"
                  style="
                    border-radius: 999px;
                    border: 1px solid rgba(255,255,255,0.4);
                    background: rgba(255,255,255,0.12);
                    color: #fff;
                    margin-top: 10px;
                    padding: 6px 12px;
                    font-size: 13px;
                    cursor: pointer;
                    backdrop-filter: blur(4px);
                  "
                >
                  차트 보기
                </button>
          </div>
                `,
            size: new naver.maps.Size(22, 35),
            anchor: new naver.maps.Point(11, 35),
            onClick: boardView(
              marker.boardNo,
              marker.addr,
              marker.ctpv,
              marker.sgg,
            ),
          });
        } else {
          navigate("/map-community");
          markerName.setIcon({
            content: `
          <div>
            <img
              loading="lazy"
              decoding="async"
              src=${marker.memberThumb || defaultImg}
              style="width: 38px; height: 36px; object-fit: cover; border-radius: \
              50%;margin: 0px; padding: 0px; z-index:${2 + i}; border: 0px solid \
              transparent; display: block; min-width: 38px; min-height: none; \
              -webkit-user-select: none; position: absolute; left: 0px; top: 0px; \
              transform: translate(15%, 15%);"
            />
            <img
              loading="lazy"
              decoding="async"
              src='src/assets/img/defaultthumbmarker.png'
              style="width: 30px; margin: 0px; padding: 0px; border: 0px solid \
              transparent; display: block; min-width: 50px; min-height: none; \
              -webkit-user-select: none; z-index:${1 + i}; position: absolute; \
              left: 0px; top: 0px;"
            />
          </div>`,
            size: new naver.maps.Size(22, 35),
            anchor: new naver.maps.Point(11, 35),
          });
        }
      });
    });

    window.naver.maps.Event.once(map, "init", () => {
      fetch("/sgg.geojson")
        .then((res) => res.json())
        .then((geojson) => {
          // 1. 데이터를 지도에 추가
          const features = map.data.addGeoJson(geojson);

          // 2. 추가된 feature들 중에서 '중구' 찾기
          features.forEach((feature) => {
            // SIG_CD가 '11140'이거나 SIG_KOR_NM이 '중구'인 경우 (데이터 구조에 따라 확인 필요)
            if (
              feature.getProperty("SIG_CD") === "11140" ||
              feature.getProperty("SIG_KOR_NM") === "중구"
            ) {
              // 기본 포커스 설정
              feature.setProperty("focus", true);

              // (선택사항) 중구의 위치를 가져와 지도의 중심을 중구로 이동
              // const center = e.feature.getBounds().getCenter(); // Bounds를 쓰려면 계산 로직 필요
              // map.setCenter(new naver.maps.LatLng(37.563656, 126.99751));
              if (feature.getProperty("SIG_CD") === "11140") {
                feature.setProperty("focus", true);

                // 툴팁 강제 노출 (중구 근처 좌표 예시)
                tooltip.style.display = "block";
                tooltip.style.left = "50%"; // 초기 위치는 적절히 조정 필요
                tooltip.style.top = "50%";
              }
            }
          });
          // 지도를 클릭해서 위치를 선택하면 해당 지역의 탄소 차트를 표시함.
          // 차트는 사용자가 실제로 위치를 클릭할 때만 열리도록 유지함.
        })
        .catch((err) => console.error("GeoJSON 로드 실패:", err));

      setupDataLayer(map);
      // 중구를 찾았을 때 추가 로직
    });
    const setupDataLayer = (map) => {
      map.data.setStyle((feature) => ({
        fillColor: "var(--color1)",
        fillWeight: 1,
        fillOpacity: 0,
        strokeColor: "var(--color1)",
        strokeWeight: 1,
        strokeOpacity: 0.5,
        // focus 속성에 따른 변화
        ...(feature.getProperty("focus") && {
          fillOpacity: 0.3,
          fillColor: "#c6ff40",
          strokeColor: "#c6ff40",
          strokeWeight: 3,
        }),
      }));

      // 클릭: 포커스 토글
      map.data.addListener("click", (e) => {
        navigate("/map-community");
        detailMode = false;
        defaultMarker.setPosition(e.coord);
        naver.maps.Service.reverseGeocode(
          {
            location: e.coord,
          },
          (status, response) => {
            if (status != naver.maps.Service.Status.OK) {
              alert("주소를 찾을 수 없습니다.");
              return;
            }
            console.log(response);

            updateSelectedRegion({
              ctpv: response.result.items[0].addrdetail.sido,
              sgg: response.result.items[0].addrdetail.sigugun,
              addr: response.result.items[0].address,
              lat: e.coord.lat(),
              lng: e.coord.lng(),
            });
            setSido(response.result.items[0].addrdetail.sido);
            setSigungu(response.result.items[0].addrdetail.sigugun);
          },
        );
        const feature = e.feature;
        map.data.forEach((f) => {
          f.setProperty("focus", false);
        });
        feature.setProperty("focus", true);
        console.log(e.feature.property_SIG_KOR_NM);
        console.log(ctpvsgg.sgg);
        e.feature.property_SIG_KOR_NM == ctpvsgg.sgg
          ? feature.setProperty("focus", !feature.setProperty("focus"))
          : null;
      });

      // 마우스 오버: 툴팁 표시 및 스타일 강조
      map.data.addListener("mouseover", (e) => {
        const feature = e.feature;
        const regionName = feature.getProperty("SIG_KOR_NM"); // 파이썬에서 남긴 컬럼명

        tooltip.style.display = "block";
        tooltip.style.left = `${e.offset.x}px`;
        tooltip.style.top = `${e.offset.y}px`;
        tooltip.innerText = regionName;

        map.data.overrideStyle(feature, {
          fillOpacity: 0.4,
          strokeWeight: 3,
          strokeOpacity: 1,
        });
      });

      // 마우스 아웃: 툴팁 숨기기
      map.data.addListener("mouseout", () => {
        tooltip.style.display = "none";
        map.data.revertStyle();
      });
    };
  }, [markerList]);

  // 지역 이름을 비교하기 쉽게 정규화하는 함수임.
  // 공백 제거, '특별시', '광역시', '시', '군', '구', '도' 같은 접미사를 제거한 뒤 소문자로 변환함.
  const normalizeRegionName = (name) =>
    (name || "")
      .toString()
      .replace(/\s+/g, "")
      .replace(/특별시|광역시|시|군|구|도$/g, "")
      .toLowerCase();

  // 시도/시군구 데이터를 하나의 문자열 키로 만든 뒤 비교하기 위함.
  // 예: '서울특별시' + '중구'를 '서울|중구' 형태로 변환.
  const getRegionKey = (ctpv, sgg) =>
    `${normalizeRegionName(ctpv)}|${normalizeRegionName(sgg)}`;

  // 현재 선택된 지역과 일치하는 통계 데이터를 ctpvsggList에서 찾음.
  // 이 값은 선택한 구역의 게시글 개수를 기준으로 함.
  const selectedRegion = ctpvsggList.find(
    (item) =>
      getRegionKey(item.ctpv, item.sgg) ===
      getRegionKey(ctpvsgg.ctpv, ctpvsgg.sgg),
  );
  // 선택된 지역의 게시물 개수를 가져오는 값임.
  // 백엔드에서 지역별 게시물 수를 계산해서 boardCount 필드로 전달함.
  const selectedRegionCount = Number(selectedRegion?.boardCount ?? 0);
  // 선택된 지역 게시물 수에 2kg를 곱한 값은 간단한 절감 추정치임.
  // 실제 배출량 감소가 아니라 지역 게시물 활동량을 보기 쉽게 보여주기 위한 값임.
  const estimatedRegionCo2 = selectedRegionCount * 2;

  // 차트 위에 값 텍스트를 직접 표시하는 플러그인임.
  // 점 위에 라벨이 겹치면 가독성이 떨어지므로,
  // 데이터 개수가 적을 때만 플러그인을 적용함.
  const regionValuePlugin = {
    id: "regionValuePlugin",
    afterDatasetsDraw: (chart) => {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((point, index) => {
          const value = dataset.data[index];
          ctx.save();
          ctx.fillStyle = "#333";
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.fillText(
            typeof value === "number" ? value.toLocaleString() : value,
            point.x,
            point.y - 10,
          );
          ctx.restore();
        });
      });
    },
  };

  const regionChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: `${ctpvsgg.ctpv} ${ctpvsgg.sgg} 월간 탄소 배출 변화`,
        color: "#333",
      },
      tooltip: {
        position: "nearest",
        yAlign: "bottom",
        xAlign: "center",
        callbacks: {
          title: (context) => context[0]?.label || "",
          label: (context) => `${context.parsed.y?.toLocaleString()} kg`,
        },
      },
    },
    scales: {
      x: {
        type: "category",
        title: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          autoSkip: false,
        },
      },
      y: {
        title: {
          // 차트 내부 y축 제목은 숨김 처리함.
          // 내부 글자가 복잡하면 사용자 보기 어려우므로 외부에 별도 레이블을 쓴다.
          display: false,
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className={styles.map_div}>
      <div>
        {detailMode ? (
          ""
        ) : (
          <>
            <div className={styles.spot_box}>
              <div className={styles.spot_box_top}>
                <p>
                  {addr == " "
                    ? "주소 정보가 없습니다"
                    : ctpvsgg.ctpv + " " + ctpvsgg.sgg}
                </p>
                <div>
                  <div className={styles.spot_box_top_posts}>
                    <DescriptionOutlinedIcon sx={{ fontSize: "24px" }} />
                    <div>{selectedRegionCount.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              <div>
                <p>
                  <CelebrationOutlinedIcon sx={{ fontSize: "30px" }} />
                </p>
                <p>
                  <strong>{selectedRegionCount.toLocaleString()}</strong>명의
                  구민들이 탄소 배출량{" "}
                  <strong>{estimatedRegionCo2.toLocaleString()}kg</strong>을
                  절감했습니다!
                </p>
              </div>
            </div>
            <div className={styles.map_item}>
              <p>
                <ErrorOutlineOutlinedIcon
                  sx={{ color: "#fff", fontSize: "18px" }}
                />
              </p>
              <p>
                {/* 실제 DB 기반 지역 탄소 배출량을 보여줌. */}
                탄소 배출량 {actualCo2.toLocaleString()}kg
              </p>
              {!showRegionChart && (
                <button
                  type="button"
                  className={styles.regionChartToggleButton}
                  onClick={() => setShowRegionChart(true)}
                >
                  차트 보기
                </button>
              )}
            </div>
            {showRegionChart && (
              <div className={styles.regionChartBox}>
                <button
                  className={styles.closeButton}
                  type="button"
                  onClick={() => setShowRegionChart(false)}
                  aria-label="차트 닫기"
                >
                  <CloseOutlinedIcon sx={{ fontSize: 18 }} />
                </button>
                <div className={styles.regionChartHeader}>
                  <p>
                    {ctpvsgg.ctpv && ctpvsgg.sgg
                      ? `${ctpvsgg.ctpv} ${ctpvsgg.sgg} 탄소 배출 변화`
                      : "지역을 선택하면 차트를 표시합니다"}
                  </p>
                </div>
                <div className={styles.regionChartContent}>
                  {chartLoading ? (
                    <p>차트 로딩 중...</p>
                  ) : regionChartData && regionChartData.labels.length > 0 ? (
                    <div className={styles.regionChartWithLabel}>
                      {/*
                        y축 제목을 차트 바깥에 별도로 표시함.
                        이렇게 하면 글자가 세로로 쌓인 형태로 보여서
                        사용자가 더 쉽게 읽을 수 있음.
                      */}
                      <div className={styles.regionChartYAxisLabel}>
                        <span>배</span>
                        <span>출</span>
                        <span>량</span>
                        <span>(kg)</span>
                      </div>
                      <div className={styles.regionChartCanvas}>
                        <Line
                          options={regionChartOptions}
                          data={regionChartData}
                          plugins={
                            regionChartData.labels.length <= 6
                              ? [regionValuePlugin]
                              : []
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <p>선택된 지역의 차트 데이터를 찾을 수 없습니다.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <div
          id="map"
          className={styles.map}
          ref={mapElement}
          style={{ width: "100%", height: "100%" }}
        ></div>
        <div
          ref={tooltipRef}
          style={{
            position: "absolute",
            display: "none",
            zIndex: 1000,
            padding: "5px 10px",
            backgroundColor: "white",
            border: "2px solid black",
            fontSize: "14px",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};

export default MapCommunityPage;
