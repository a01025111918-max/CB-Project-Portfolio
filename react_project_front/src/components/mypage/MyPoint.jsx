import { useEffect, useState } from "react";
import axios from "axios";
import useAuthStore from "../../store/useAuthStore";
import styles from "./MyPoint.module.css";

const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

const MyPoint = () => {
  const { memberId } = useAuthStore();

  const [point, setPoint] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const formatDate = (date) => {
    if (!date) return "-";
    return String(date).slice(0, 10);
  };

  useEffect(() => {
    if (!memberId) {
      setPoint(0);
      setHistory([]);
      setLoading(false);
      return;
    }

    const fetchPointData = async () => {
      try {
        setLoading(true);

        const [pointRes, historyRes] = await Promise.all([
          axios.get(`${BACKSERVER}/point-give/${memberId}`),
          axios.get(`${BACKSERVER}/point-history/${memberId}`),
        ]);

        console.log("point 응답:", pointRes.data);
        console.log("history 응답:", historyRes.data);

        setPoint(pointRes.data ?? 0);
        setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
      } catch (err) {
        console.error("포인트 데이터 조회 실패", err);
        console.error("응답 상태:", err?.response?.status);
        console.error("응답 데이터:", err?.response?.data);
        console.error("요청 URL:", err?.config?.url);
        setPoint(0);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPointData();
  }, [memberId]);

  return (
    <section className={styles.pointCard}>
      <div className={styles.pointHeader}>
        <h2 className={styles.pointTitle}>포인트 이력</h2>
        <p className={styles.pointDesc}>
          활동으로 적립되거나 사용된 포인트를 한눈에 확인해보세요.
        </p>
      </div>

      <div className={styles.pointSummary}>
        <div className={styles.summaryText}>
          <p className={styles.summaryLabel}>현재 보유 포인트</p>
          <p className={styles.summaryValue}>{point.toLocaleString()}p</p>
        </div>
        <div className={styles.summaryBadge}>친환경 활동 중</div>
      </div>

      <div className={styles.listHeader}>
        <span>최근 내역</span>
        <span>{history.length}건</span>
      </div>

      <div className={styles.pointListBox}>
        {loading ? (
          <p className={styles.message}>포인트 내역을 불러오는 중입니다.</p>
        ) : history.length === 0 ? (
          <p className={styles.message}>아직 포인트 내역이 없습니다.</p>
        ) : (
          history.map((item, index) => {
            const isPlus = item.pointChange > 0;

            return (
              <div
                className={styles.pointItem}
                key={item.pointNo ?? `${item.createdDate}-${index}`}
              >
                <div className={styles.itemLeft}>
                  <p className={styles.date}>{formatDate(item.createdDate)}</p>
                  <p className={styles.reason}>
                    {item.pointReason || "포인트 변동"}
                  </p>
                </div>

                <span
                  className={`${styles.pointValue} ${
                    isPlus ? styles.pointPlus : styles.pointMinus
                  }`}
                >
                  {isPlus
                    ? `+${item.pointChange.toLocaleString()}p`
                    : `${item.pointChange.toLocaleString()}p`}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default MyPoint;
