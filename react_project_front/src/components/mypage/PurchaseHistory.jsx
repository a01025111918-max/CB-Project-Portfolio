import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import styles from "./PurchaseHistory.module.css";
import { getCompletedPurchases } from "./orderHistoryStorage";
import { normalizeImageUrl } from "../../utils/getImageUrl";

const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";
const PAGE_SIZE = 6;
const getStatusPrefix = (status) => (status ? `[${status}] ` : "");

// 구매내역 페이지임.
//  - 로그인한 사용자의 구매한 상품 기록을 보여줌.
//  - 서버에서 거래 정보와 연관 상품 정보를 함께 가져와서 렌더링함.

const getImageUrl = normalizeImageUrl;

const getShippingStatusLabel = (status) => {
  if (status === 1 || status === "1") return "배송완료";
  return "배송전";
};

const getCourierLabel = (code) => {
  if (code === 1 || code === "1") return "CJ대한통운";
  if (code === 2 || code === "2") return "현대택배";
  if (code === 3 || code === "3") return "한진택배";
  if (code === 4 || code === "4") return "로젠택배";
  if (code === 5 || code === "5") return "우체국택배";
  return "미지정";
};

const resolveTradeType = (type, typeText, deliveryMethod, address) => {
  const normalized = String(type ?? typeText ?? deliveryMethod ?? "").trim();
  const addressExists = Boolean((address ?? "").toString().trim());

  if (normalized === "0" || normalized === "직거래/택배") {
    if (
      deliveryMethod === "delivery" ||
      deliveryMethod === "택배" ||
      addressExists
    )
      return "택배";
    if (deliveryMethod === "direct" || deliveryMethod === "직거래")
      return "직거래";
    return "직거래/택배";
  }
  if (normalized === "1" || normalized === "직거래" || normalized === "direct")
    return "직거래";
  if (normalized === "2" || normalized === "택배" || normalized === "delivery")
    return "택배";
  return addressExists ? "택배" : "직거래";
};

const getTradeTypeLabel = (item, tradeInfo) => {
  const address =
    item.orderInfo?.address || item.address || tradeInfo?.address || "";
  const tradeType = tradeInfo?.tradeType ?? item.tradeType;
  const tradeTypeText = tradeInfo?.tradeTypeText ?? item.tradeTypeText;
  const deliveryMethod = tradeInfo?.deliveryMethod ?? item.deliveryMethod;
  return resolveTradeType(tradeType, tradeTypeText, deliveryMethod, address);
};

const getPurchaseTradeStatusLabel = (status) => {
  if (status === 0 || status === "0") return "요청";
  if (status === 1 || status === "1") return "진행중";
  if (status === 2 || status === "2") return "완료";
  if (status === 3 || status === "3") return "취소";
  if (status === 4 || status === "4") return "환불";
  return status ?? "";
};

const isDeliveryTrade = (item) => {
  const address = item.orderInfo?.address || item.address || "";
  const resolved = resolveTradeType(
    item.tradeType,
    item.tradeTypeText,
    item.deliveryMethod,
    address,
  );
  return resolved === "택배" || resolved === "직거래/택배";
};

// 구매내역 페이지 기능임. 로그인한 사용자가 완료한 구매 내역을 보여줌.
//  - 구매 상품 목록을 페이지 단위로 렌더링함.
//  - 각 주문의 배송 정보는 추가 API 호출로 가져옴.
const PurchaseHistory = () => {
  const { memberId } = useAuthStore();
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [tradeInfoMap, setTradeInfoMap] = useState({});
  const [boardInfoMap, setBoardInfoMap] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // 구매내역 데이터를 서버에서 조회하는 기능임.
    //  - buyerId로 나의 구매 기록을 가져오고,
    //  - 서버에 데이터가 없으면 로컬 저장된 완료 구매 내역을 보여줌.
    const fetchPurchaseHistory = async () => {
      if (!memberId) {
        setPurchaseHistory([]);
        return;
      }

      try {
        const res = await axios.get(`${BACKSERVER}/api/store/trades`, {
          params: { buyerId: memberId },
        });
        const serverItems = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.items)
            ? res.data.items
            : [];
        const localItems = memberId ? getCompletedPurchases(memberId) : [];
        const existingKeys = new Set(
          serverItems.map((item) =>
            String(item.tradeNo ?? item.marketNo ?? item.id ?? ""),
          ),
        );
        const combinedItems = serverItems.concat(
          localItems.filter((item) => {
            const key = String(item.tradeNo ?? item.marketNo ?? item.id ?? "");
            return key && !existingKeys.has(key);
          }),
        );
        const items = combinedItems.length > 0 ? combinedItems : localItems;
        setPurchaseHistory(items);
        const initialTradeMap = {};
        items.forEach((item) => {
          const marketNo = item.marketNo ?? item.id;
          if (marketNo) {
            initialTradeMap[marketNo] = item;
          }
        });
        setTradeInfoMap(initialTradeMap);
      } catch (err) {
        console.error("구매내역 서버 조회 실패:", err);
        setPurchaseHistory(memberId ? getCompletedPurchases(memberId) : []);
      }
    };

    fetchPurchaseHistory();
  }, [memberId]);

  useEffect(() => {
    const backendUrl =
      import.meta.env.VITE_BACKSERVER ||
      "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";
    const currentItems = purchaseHistory.slice(
      (currentPage - 1) * PAGE_SIZE,
      (currentPage - 1) * PAGE_SIZE + PAGE_SIZE,
    );

    const fetchTradeInfo = async (marketNo) => {
      const url = `${backendUrl}/api/store/markets/${marketNo}/trade-info`;
      const urlWithBuyer = memberId ? `${url}?buyerId=${memberId}` : url;
      try {
        let res = await fetch(urlWithBuyer);
        if (res.ok) return await res.json();
        if (memberId && res.status === 404) {
          res = await fetch(url);
          if (res.ok) return await res.json();
        }
        return null;
      } catch {
        return null;
      }
    };

    const fetchBoardInfo = async (marketNo) => {
      try {
        const res = await axios.get(
          `${backendUrl}/api/store/boards/${marketNo}`,
        );
        return res.data;
      } catch {
        return null;
      }
    };

    const loadTradeAndBoardInfos = async () => {
      if (!memberId || currentItems.length === 0) return;
      const marketNos = Array.from(
        new Set(
          currentItems
            .map((item) => item.marketNo ?? item.id)
            .filter((marketNo) => marketNo),
        ),
      );

      const tradeMarketNos = marketNos.filter(
        (marketNo) => !(marketNo in tradeInfoMap),
      );
      const boardMarketNos = marketNos.filter(
        (marketNo) => !(marketNo in boardInfoMap),
      );

      const tradeResults =
        tradeMarketNos.length > 0
          ? await Promise.all(
              tradeMarketNos.map((marketNo) => fetchTradeInfo(marketNo)),
            )
          : [];
      const boardResults =
        boardMarketNos.length > 0
          ? await Promise.all(
              boardMarketNos.map((marketNo) => fetchBoardInfo(marketNo)),
            )
          : [];

      if (tradeMarketNos.length > 0) {
        setTradeInfoMap((prev) => {
          const next = { ...prev };
          tradeMarketNos.forEach((marketNo, index) => {
            next[marketNo] = tradeResults[index] ?? null;
          });
          return next;
        });
      }

      if (boardMarketNos.length > 0) {
        setBoardInfoMap((prev) => {
          const next = { ...prev };
          boardMarketNos.forEach((marketNo, index) => {
            next[marketNo] = boardResults[index] ?? null;
          });
          return next;
        });
      }
    };

    loadTradeAndBoardInfos();
  }, [purchaseHistory, currentPage, memberId]);

  const pageCount = Math.max(1, Math.ceil(purchaseHistory.length / PAGE_SIZE));

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return purchaseHistory.slice(start, start + PAGE_SIZE);
  }, [currentPage, purchaseHistory]);

  const changePage = (page) => {
    if (page < 1 || page > pageCount) return;
    setCurrentPage(page);
  };

  return (
    <div className={styles.purchase_history_wrap}>
      <section className={styles.purchase_status_section}>
        <div className={styles.status_header}>
          <h3 className={styles.purchase_title}>구매내역</h3>
          <span>{purchaseHistory.length}건</span>
        </div>
        <div className={styles.purchase_list}>
          {purchaseHistory.length === 0 && (
            <p>실제 결제 완료 내역이 없습니다.</p>
          )}
          {currentItems.map((item) => {
            const purchaseId =
              item.tradeNo ??
              item.id ??
              item.marketNo ??
              `${item.buyerId || "unknown"}-${item.createdAt || item.date || Math.random()}`;
            const marketNo = item.marketNo ?? item.id ?? item.tradeNo;
            const tradeInfo = marketNo ? tradeInfoMap[marketNo] : null;
            const boardInfo = marketNo ? boardInfoMap[marketNo] : null;
            const displayShippingStatus =
              tradeInfo?.shippingStatus ?? item.shippingStatus;
            const displayCourierCode =
              tradeInfo?.courierCode ?? item.courierCode;
            const displayInvoiceNumber =
              tradeInfo?.invoiceNumber ?? item.invoiceNumber;
            const address = item.orderInfo?.address || item.address || "";
            const displayTradeType = getTradeTypeLabel(item, tradeInfo);
            const hasDelivery =
              displayTradeType === "택배" || displayTradeType === "직거래/택배";
            const itemTitle =
              boardInfo?.marketTitle ||
              item.title ||
              item.marketTitle ||
              item.orderName ||
              "상품 이미지";
            const imageUrl = getImageUrl(
              boardInfo?.productThumb ||
                item.productThumb ||
                item.thumb ||
                tradeInfo?.productThumb,
            );
            const displayAmount =
              item.tradePrice ?? item.amount ?? item.orderPrice ?? 0;
            const displayStatus = getPurchaseTradeStatusLabel(
              item.status ?? item.tradeStatus,
            );
            const displayDate = item.completedAt ?? item.createdAt ?? item.date;

            return (
              <Link
                key={purchaseId}
                to={`/mypage/history/purchase/${purchaseId}`}
                className={styles.purchase_card}
              >
                <div className={styles.purchase_card_image_wrap}>
                  {imageUrl ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={imageUrl}
                      alt={itemTitle}
                      className={styles.purchase_card_image}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className={styles.purchase_card_image_fallback}>
                      이미지
                    </div>
                  )}
                </div>
                <div className={styles.purchase_card_title}>
                  {getStatusPrefix(displayStatus)}
                  {itemTitle}
                </div>
                <div className={styles.purchase_card_meta}>
                  {displayDate} · {displayStatus}
                </div>
                <div className={styles.purchase_card_detail}>
                  {displayAmount?.toLocaleString("ko-KR")}원
                </div>
                <div className={styles.purchase_card_detail}>
                  거래방법: {displayTradeType}
                </div>
                {hasDelivery && (
                  <>
                    <div className={styles.purchase_card_detail}>
                      배송 상태: {getShippingStatusLabel(displayShippingStatus)}
                    </div>
                    <div className={styles.purchase_card_detail}>
                      택배사: {getCourierLabel(displayCourierCode)}
                    </div>
                    {displayInvoiceNumber ? (
                      <div className={styles.purchase_card_detail}>
                        송장번호: {displayInvoiceNumber}
                      </div>
                    ) : null}
                  </>
                )}
              </Link>
            );
          })}
        </div>
        {pageCount > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              &lt;
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (page) => (
                <button
                  key={page}
                  type="button"
                  className={currentPage === page ? styles.activePage : ""}
                  onClick={() => changePage(page)}
                >
                  {page}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === pageCount}
            >
              &gt;
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default PurchaseHistory;
