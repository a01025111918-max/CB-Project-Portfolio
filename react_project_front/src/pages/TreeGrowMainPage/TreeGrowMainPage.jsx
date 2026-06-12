import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import TreeGrowMain from "../../components/TreeGrowMain/TreeGrowMain";
import styles from "./TreeGrowMainPage.module.css";
import RegionMap from "../../components/mainpage/RegionMap";
import ArrowBackIosOutlinedIcon from "@mui/icons-material/ArrowBackIosOutlined";

const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

const BASE_NOTICE =
  "📢 8개 지역중 거주한 지역에 물을 주세요. 📢 나무는 일주일마다 초기화 됩니다.";

const SLIDE_DURATION = 2500;

const TreeGrowMainPage = () => {
  const [selectedRegionNo, setSelectedRegionNo] = useState(2);
  const [serverNotices, setServerNotices] = useState([]);
  const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);

  const navigate = useNavigate();
  const slideTimerRef = useRef(null);

  const fetchNotices = async () => {
    try {
      const res = await axios.get(`${BACKSERVER}/regions/notices`);
      setServerNotices(res.data);
    } catch (error) {
      console.error("공지 조회 실패:", error);
    }
  };

  useEffect(() => {
    fetchNotices();

    const interval = setInterval(() => {
      fetchNotices();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const notices = useMemo(() => {
    const list = [
      {
        id: "base",
        message: BASE_NOTICE,
      },
    ];

    serverNotices.forEach((notice) => {
      list.push({
        id: notice.contributionNo,
        message: `💧 ${notice.memberId}님이 ${
          notice.regionName ?? `지역 ${notice.regionNo}`
        }에 ${notice.contributedPoint}H2O를 주었습니다.`,
      });
    });

    return list;
  }, [serverNotices]);

  useEffect(() => {
    if (slideTimerRef.current) {
      clearInterval(slideTimerRef.current);
    }

    if (notices.length <= 1) {
      setCurrentNoticeIndex(0);
      return;
    }

    slideTimerRef.current = setInterval(() => {
      setCurrentNoticeIndex((prev) => (prev + 1) % notices.length);
    }, SLIDE_DURATION);

    return () => {
      if (slideTimerRef.current) {
        clearInterval(slideTimerRef.current);
      }
    };
  }, [notices]);

  useEffect(() => {
    if (currentNoticeIndex >= notices.length) {
      setCurrentNoticeIndex(0);
    }
  }, [currentNoticeIndex, notices.length]);

  useEffect(() => {
    return () => {
      if (slideTimerRef.current) {
        clearInterval(slideTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.treeGrowMainPage}>
      <div className={styles.topSection}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowBackIosOutlinedIcon fontSize="small" />
          홈으로
        </button>

        <div className={styles.noticeBox}>
          <span className={styles.noticeLabel}>공지</span>

          <div className={styles.noticeViewport}>
            {notices.map((notice, index) => (
              <div
                key={notice.id}
                className={`${styles.noticeSlide} ${
                  index === currentNoticeIndex ? styles.active : ""
                }`}
                aria-hidden={index !== currentNoticeIndex}
              >
                <span className={styles.noticeText}>{notice.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.mapBox}>
            <RegionMap
              selectedRegionNo={selectedRegionNo}
              onSelectRegion={setSelectedRegionNo}
            />
          </div>
        </div>

        <div className={styles.right}>
          <TreeGrowMain selectedRegionNo={selectedRegionNo} />
        </div>
      </div>
    </div>
  );
};

export default TreeGrowMainPage;
