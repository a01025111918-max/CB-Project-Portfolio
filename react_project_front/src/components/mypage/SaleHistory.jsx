import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import { getCompletedSales } from "./orderHistoryStorage";
import { normalizeImageUrl } from "../../utils/getImageUrl";
import styles from "./SaleHistory.module.css";

const PAGE_SIZE = 3;

const normalizeStatus = (status) =>
  String(status ?? "")
    .replace(/\s+/g, "")
    .trim();

// 판매내역 페이지임.
//  - 판매자가 등록한 상품과 거래 상태를 확인할 수 있는 화면.
//  - 판매중/배송대기/판매완료 탭으로 구분해서 표시함.

const getSaleStatusLabel = (productStatus) => {
  const normalized = normalizeStatus(productStatus);
  if (normalized === "0" || normalized === "판매중") return "판매중";
  if (normalized === "1" || normalized === "예약중") return "예약중";
  if (
    normalized === "2" ||
    normalized === "판매완료" ||
    normalized === "구매완료"
  )
    return "판매완료";
  return "판매중";
};

const getTradeStatusLabel = (tradeStatus) => {
  if (tradeStatus === 0 || tradeStatus === "0") return "요청";
  if (tradeStatus === 1 || tradeStatus === "1") return "진행중";
  if (tradeStatus === 2 || tradeStatus === "2") return "완료";
  if (tradeStatus === 3 || tradeStatus === "3") return "취소";
  if (tradeStatus === 4 || tradeStatus === "4") return "환불";
  return "판매중";
};

const getSaleCardStatus = (item) => {
  if (item?.tradeStatus != null && item.tradeStatus !== "") {
    return getTradeStatusLabel(item.tradeStatus);
  }
  return getSaleStatusLabel(item.status ?? item.productStatus);
};

const getShippingStatusLabel = (status) => {
  const normalized = String(status ?? "").trim();
  if (!normalized) return "배송전";
  if (
    normalized === "1" ||
    normalized === "배송완료" ||
    normalized === "배송 완료" ||
    normalized === "판매완료" ||
    normalized === "구매완료"
  ) {
    return "배송완료";
  }
  if (
    normalized === "0" ||
    normalized === "배송전" ||
    normalized === "배송 전" ||
    normalized === "배송대기" ||
    normalized === "배송 대기"
  ) {
    return "배송대기";
  }
  if (normalized.includes("완료")) return "배송완료";
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

const getDisplayName = (item) => {
  const name =
    item?.buyerNickname?.trim() ||
    item?.sellerNickname?.trim() ||
    item?.buyerName?.trim() ||
    item?.sellerName?.trim();
  if (!name || ["null", "undefined"].includes(name.toLowerCase())) {
    return item?.buyerId || item?.sellerId || "";
  }
  return name;
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
  return resolveTradeType(
    item.tradeType,
    item.tradeTypeText,
    item.deliveryMethod,
    address,
  );
};

const getShippingStatusValue = (item, tradeInfo) => {
  if (tradeInfo?.shippingStatus != null) return tradeInfo.shippingStatus;
  if (item.shippingStatus != null) return item.shippingStatus;
  return 0;
};

// 택배 거래인 경우에만 배송대기 여부를 판별함.
// 택배 거래이면서 송장번호가 없거나 배송상태가 완료가 아니면 배송대기로 보고함.
const isDeliveryPendingTrade = (item, tradeInfo) => {
  const tradeStatus = item.tradeStatus ?? tradeInfo?.tradeStatus;
  if (
    tradeStatus != null &&
    String(tradeStatus) !== "0" &&
    String(tradeStatus) !== "1"
  ) {
    return false;
  }

  const tradeType = getTradeTypeLabel(item, tradeInfo);
  if (tradeType !== "택배" && tradeType !== "직거래/택배") return false;

  const shippingStatus = getShippingStatusValue(item, tradeInfo);
  const invoiceNumber = tradeInfo?.invoiceNumber ?? item.invoiceNumber;
  const hasInvoice = Boolean((invoiceNumber ?? "").toString().trim());

  return !(shippingStatus === 1 || shippingStatus === "1") || !hasInvoice;
};

const getTradeInfoForItem = (item, tradeInfoMap) => {
  const marketNo = item.marketNo ?? item.id;
  return marketNo ? tradeInfoMap[marketNo] : null;
};

const getImageUrl = normalizeImageUrl;

const getBoardForMarketNo = (marketNo, boards) => {
  if (!marketNo) return null;
  return boards.find(
    (board) =>
      String(board.marketNo) === String(marketNo) ||
      String(board.id) === String(marketNo),
  );
};

// 화면에 보여줄 배송 상태 텍스트를 계산함.
// 송장번호가 없으면 무조건 "배송대기"로 표시함.
const getDisplayShippingStatusLabel = (item, tradeInfo) => {
  const tradeStatus = item.tradeStatus ?? tradeInfo?.tradeStatus;
  if (tradeStatus === 2 || tradeStatus === "2") {
    return "배송완료";
  }

  const shippingStatus = getShippingStatusValue(item, tradeInfo);
  const invoiceNumber = tradeInfo?.invoiceNumber ?? item.invoiceNumber;
  const hasInvoice = Boolean((invoiceNumber ?? "").toString().trim());
  if (!hasInvoice) {
    return "배송대기";
  }
  return getShippingStatusLabel(shippingStatus);
};

const getItemTitle = (item, tradeInfo) => {
  return (
    item.title ||
    item.marketTitle ||
    item.marketName ||
    item.boardTitle ||
    item.orderName ||
    item.productName ||
    item.productTitle ||
    item.orderInfo?.orderName ||
    tradeInfo?.marketTitle ||
    tradeInfo?.productName ||
    tradeInfo?.productTitle ||
    tradeInfo?.orderName ||
    ""
  );
};

const stripStatusTag = (title) => {
  if (!title) return "";
  return title.replace(
    /^\s*\[(판매중|거래중|판매완료|예약중|배송대기|요청|진행중|취소|환불|완료)\]\s*/i,
    "",
  );
};

const getBoardTitleStatus = (item) => {
  const title = getItemTitle(item);
  const match = title.match(/^\s*\[(판매중|거래중|판매완료|예약중)\]/i);
  if (match) return match[1];
  return getSaleStatusLabel(item.productStatus);
};

const hasSellingTag = (item) => {
  const title = getItemTitle(item).toString();
  return title.includes("[판매중]");
};

const hasShippingDetails = (item, tradeInfo) => {
  const invoiceNumber = tradeInfo?.invoiceNumber ?? item.invoiceNumber;
  const shippingStatus = getShippingStatusValue(item, tradeInfo);
  return Boolean(
    invoiceNumber ||
    (shippingStatus !== null &&
      shippingStatus !== undefined &&
      shippingStatus !== "") ||
    tradeInfo?.courierCode != null ||
    item.courierCode != null,
  );
};

const isBoardSelling = (item) => {
  return getBoardTitleStatus(item) === "판매중";
};

// 판매내역 페이지 기능임. 로그인한 판매자의 판매 상품과 거래 상태를 보여줌.
//  - 판매중, 배송대기, 판매완료 3가지 탭으로 구분함.
//  - 각 목록의 거래 정보는 추가 API 호출로 가져옴.
const SaleHistory = () => {
  const { memberId } = useAuthStore();
  const [salesHistory, setSalesHistory] = useState([]);
  const [sellerBoards, setSellerBoards] = useState([]);
  const [tradeInfoMap, setTradeInfoMap] = useState({});
  const [sellingPage, setSellingPage] = useState(1);
  const [deliveryWaitingPage, setDeliveryWaitingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);

  useEffect(() => {
    // 판매내역 데이터를 서버에서 조회하는 기능임.
    //  - sellerId로 나의 판매 거래 기록을 가져오고,
    //  - 서버 호출 실패 시 로컬 임시 저장된 판매 내역을 표시함.
    const fetchSalesHistory = async () => {
      if (!memberId) {
        setSalesHistory([]);
        return;
      }

      try {
        const backendUrl =
          import.meta.env.VITE_BACKSERVER ||
          "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";
        const res = await axios.get(`${backendUrl}/api/store/trades`, {
          params: { sellerId: memberId },
        });
        const items = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.items)
            ? res.data.items
            : [];
        setSalesHistory(items);
      } catch (error) {
        console.error("판매내역 서버 조회 실패:", error);
        setSalesHistory(getCompletedSales(memberId));
      }
    };

    fetchSalesHistory();
  }, [memberId]);

  useEffect(() => {
    const backendUrl =
      import.meta.env.VITE_BACKSERVER ||
      "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

    const loadSellerBoards = async () => {
      if (!memberId) return;
      try {
        const res = await axios.get(`${backendUrl}/api/store/boards`);
        const items = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.items)
            ? res.data.items
            : Array.isArray(res.data?.list)
              ? res.data.list
              : [];
        setSellerBoards(
          items.filter((board) => String(board.memberId) === String(memberId)),
        );
      } catch (error) {
        console.error("판매자 게시물 조회 실패", error);
      }
    };

    const loadTradeInfos = async () => {
      if (!memberId || salesHistory.length === 0) return;
      const marketNos = Array.from(
        new Set(
          salesHistory
            .map((item) => item.marketNo ?? item.id)
            .filter((marketNo) => marketNo && !tradeInfoMap[marketNo]),
        ),
      );
      if (marketNos.length === 0) return;

      const results = await Promise.all(
        marketNos.map(async (marketNo) => {
          try {
            const url = `${backendUrl}/api/store/markets/${marketNo}/trade-info`;
            const res = await fetch(url);
            if (!res.ok) return null;
            return await res.json();
          } catch {
            return null;
          }
        }),
      );

      setTradeInfoMap((prev) => {
        const next = { ...prev };
        marketNos.forEach((marketNo, index) => {
          if (results[index]) next[marketNo] = results[index];
        });
        return next;
      });
    };

    loadSellerBoards();
    loadTradeInfos();
  }, [memberId, salesHistory, tradeInfoMap]);

  const isBoardCurrentlyTraded = (board) => {
    return salesHistory.some((item) => {
      const boardKey = String(board.marketNo ?? board.id ?? "");
      const itemKey = String(item.marketNo ?? item.id ?? "");
      const activeTradeStatus = [0, 1, 2, "0", "1", "2"];
      return (
        boardKey &&
        itemKey &&
        boardKey === itemKey &&
        activeTradeStatus.includes(item.tradeStatus)
      );
    });
  };

  const sellingItems = useMemo(
    () =>
      sellerBoards.filter(
        (board) => isBoardSelling(board) && !isBoardCurrentlyTraded(board),
      ),
    [sellerBoards, salesHistory],
  );

  const deliveryWaitingItems = useMemo(
    () =>
      salesHistory.filter((item) => {
        // [판매중] 태그가 있는 항목은 판매중으로 처리함
        if (hasSellingTag(item)) return false;
        // 주문 취소된 거래는 배송대기에서 제외함
        if (String(item.tradeStatus) === "3") return false;
        const tradeInfo = getTradeInfoForItem(item, tradeInfoMap);
        // tradeInfo에서도 취소 상태이면 제외함
        if (String(tradeInfo?.tradeStatus) === "3") return false;
        // 그 외에는 배송대기인지 별도 함수로 판단함
        return isDeliveryPendingTrade(item, tradeInfo);
      }),
    [salesHistory, tradeInfoMap],
  );

  // 완료된 판매 거래만 골라냄.
  // 택배 거래인 경우 배송 상태가 '배송완료'일 때만 완료로 처리함.
  // 택배가 아닌 경우에는 게시글 상태가 판매완료인지 확인함.
  const completedItems = useMemo(
    () =>
      salesHistory.filter((item) => {
        if (hasSellingTag(item)) return false;
        const tradeInfo = getTradeInfoForItem(item, tradeInfoMap);
        const tradeType = getTradeTypeLabel(item, tradeInfo);
        if (tradeType === "택배" || tradeType === "직거래/택배") {
          return getDisplayShippingStatusLabel(item, tradeInfo) === "배송완료";
        }
        if (item.tradeStatus === 2 || item.tradeStatus === "2") return true;
        return (
          getSaleStatusLabel(item.status ?? item.productStatus) === "판매완료"
        );
      }),
    [salesHistory, tradeInfoMap],
  );

  const completedBoardFallbackItems = useMemo(
    () =>
      sellerBoards.filter((board) => {
        if (isBoardSelling(board)) return false;
        const boardKey = String(board.marketNo ?? board.id ?? "");
        return !salesHistory.some((item) => {
          const itemKey = String(item.marketNo ?? item.id ?? "");
          return itemKey && itemKey === boardKey;
        });
      }),
    [sellerBoards, salesHistory],
  );

  const completedItemsWithFallback = useMemo(
    () => [...completedItems, ...completedBoardFallbackItems],
    [completedItems, completedBoardFallbackItems],
  );

  const sellingPageCount = Math.max(
    1,
    Math.ceil(sellingItems.length / PAGE_SIZE),
  );
  const deliveryWaitingPageCount = Math.max(
    1,
    Math.ceil(deliveryWaitingItems.length / PAGE_SIZE),
  );
  const completedPageCount = Math.max(
    1,
    Math.ceil(completedItemsWithFallback.length / PAGE_SIZE),
  );

  const visibleSellingItems = sellingItems.slice(
    (sellingPage - 1) * PAGE_SIZE,
    sellingPage * PAGE_SIZE,
  );
  const visibleDeliveryWaitingItems = deliveryWaitingItems.slice(
    (deliveryWaitingPage - 1) * PAGE_SIZE,
    deliveryWaitingPage * PAGE_SIZE,
  );
  const visibleCompletedItems = completedItemsWithFallback.slice(
    (completedPage - 1) * PAGE_SIZE,
    completedPage * PAGE_SIZE,
  );

  const hasAnyHistory =
    sellingItems.length > 0 ||
    deliveryWaitingItems.length > 0 ||
    completedItemsWithFallback.length > 0;

  useEffect(() => {
    if (sellingPage > sellingPageCount) setSellingPage(sellingPageCount);
  }, [sellingPage, sellingPageCount]);

  useEffect(() => {
    if (deliveryWaitingPage > deliveryWaitingPageCount)
      setDeliveryWaitingPage(deliveryWaitingPageCount);
  }, [deliveryWaitingPage, deliveryWaitingPageCount]);

  useEffect(() => {
    if (completedPage > completedPageCount)
      setCompletedPage(completedPageCount);
  }, [completedPage, completedPageCount]);

  const renderPagination = (page, pageCount, onChange) => {
    const PAGE_BUTTONS = 5;
    const groupStart = Math.floor((page - 1) / PAGE_BUTTONS) * PAGE_BUTTONS + 1;
    const groupEnd = Math.min(pageCount, groupStart + PAGE_BUTTONS - 1);

    return (
      <div className={styles.pagination}>
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          &lt;
        </button>
        {Array.from(
          { length: groupEnd - groupStart + 1 },
          (_, index) => groupStart + index,
        ).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={pageNumber === page ? styles.activePage : ""}
            onClick={() => onChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          disabled={page === pageCount}
          onClick={() => onChange(page + 1)}
        >
          &gt;
        </button>
      </div>
    );
  };

  const renderSaleCard = (item, index) => {
    const marketNo = item.marketNo ?? item.id;
    const tradeInfo = marketNo ? tradeInfoMap[marketNo] : null;
    const displayShippingStatus = getShippingStatusValue(item, tradeInfo);
    const displayCourierCode = tradeInfo?.courierCode ?? item.courierCode;
    const displayInvoiceNumber = tradeInfo?.invoiceNumber ?? item.invoiceNumber;
    const address = item.orderInfo?.address || item.address || "";
    const displayTradeType = resolveTradeType(
      item.tradeType,
      item.tradeTypeText,
      item.deliveryMethod,
      address || tradeInfo?.address,
    );
    const hasDelivery =
      displayTradeType === "택배" || displayTradeType === "직거래/택배";
    const hasShippingInfo = hasDelivery && hasShippingDetails(item, tradeInfo);
    const linkMarketNo = marketNo;
    const board = getBoardForMarketNo(marketNo, sellerBoards);
    const displayTitle = stripStatusTag(
      getItemTitle(item, tradeInfo) ||
        board?.marketTitle ||
        board?.title ||
        board?.boardTitle ||
        board?.marketName ||
        "",
    );
    const displayDate = item.date
      ? new Date(item.date).toLocaleDateString("ko-KR")
      : item.createdAt
        ? new Date(item.createdAt).toLocaleDateString("ko-KR")
        : "-";
    const displayAmount = Number(
      item.tradePrice ?? item.amount ?? item.productPrice ?? 0,
    ).toLocaleString("ko-KR");
    const saleStatus = isDeliveryPendingTrade(item, tradeInfo)
      ? "배송대기"
      : getSaleCardStatus(item);
    // 이미지 경로를 여러 필드에서 순서대로 찾아서 사용함.
    // 판매중 / 배송대기 / 판매완료 항목 모두에서 이미지 경로를 최대한 찾도록 함.
    const imageUrl = getImageUrl(
      item.productThumb ||
        item.boardThumb ||
        item.thumb ||
        item.marketThumb ||
        item.thumbnail ||
        (Array.isArray(item.images) &&
          (item.images[0]?.url || item.images[0])) ||
        tradeInfo?.productThumb ||
        tradeInfo?.thumbnail ||
        tradeInfo?.marketThumb ||
        (Array.isArray(tradeInfo?.images) &&
          (tradeInfo.images[0]?.url || tradeInfo.images[0])) ||
        board?.productThumb ||
        board?.thumb ||
        board?.boardThumb ||
        board?.marketThumb ||
        board?.thumbnail ||
        board?.mainImage ||
        board?.marketImage ||
        (Array.isArray(board?.images) &&
          (board.images[0]?.url || board.images[0])) ||
        board?.image,
    );

    const displayTraderName = getDisplayName(item) || getDisplayName(tradeInfo);
    return (
      <Link
        key={`${item.tradeNo ?? marketNo ?? `sale-${index}`}-${displayTitle}-${index}`}
        to={`/mypage/history/sale/${linkMarketNo}`}
        className={styles.sale_card}
      >
        <div className={styles.sale_card_inner}>
          <div className={styles.sale_card_image_wrap}>
            {imageUrl ? (
              <img
                loading="lazy"
                decoding="async"
                src={imageUrl}
                alt={displayTitle}
                className={styles.sale_card_image}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <div className={styles.sale_card_image_fallback}>이미지 없음</div>
            )}
          </div>
          <div className={styles.sale_card_content}>
            <div className={styles.sale_card_title}>
              [{saleStatus}] {displayTitle}
            </div>
            <div className={styles.sale_card_meta}>
              {displayDate} · {saleStatus}
            </div>
            <div className={styles.sale_card_detail}>{displayAmount}원</div>
            <div className={styles.sale_card_detail}>
              거래방법: {displayTradeType}
            </div>
            {item.buyerId ||
            item.buyerNickname ||
            tradeInfo?.buyerId ||
            tradeInfo?.buyerNickname ? (
              <div className={styles.sale_card_buyer}>
                구매자: {displayTraderName}
              </div>
            ) : null}
            {hasShippingInfo && (
              <div className={styles.sale_card_shipping_info}>
                <div className={styles.sale_card_detail}>
                  배송 상태: {getDisplayShippingStatusLabel(item, tradeInfo)}
                </div>
                <div className={styles.sale_card_detail}>
                  택배사: {getCourierLabel(displayCourierCode)}
                </div>
                {displayInvoiceNumber ? (
                  <div className={styles.sale_card_detail}>
                    송장번호: {displayInvoiceNumber}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className={styles.sale_history_wrap}>
      <h3 className={styles.sale_title}>판매내역</h3>
      <div className={styles.sale_list}>
        {!hasAnyHistory ? (
          <p>등록된 판매내역이 없습니다.</p>
        ) : (
          <>
            <section className={styles.sale_status_section}>
              <div className={styles.status_header}>
                <h4>판매중</h4>
                <span>{sellingItems.length}건</span>
              </div>
              {sellingItems.length > 0 ? (
                <>
                  <div className={styles.status_card_list}>
                    {visibleSellingItems.map(renderSaleCard)}
                  </div>
                  {sellingPageCount > 1 &&
                    renderPagination(
                      sellingPage,
                      sellingPageCount,
                      setSellingPage,
                    )}
                </>
              ) : (
                <p className={styles.empty_section}>
                  판매중인 거래가 없습니다.
                </p>
              )}
            </section>

            <section className={styles.sale_status_section}>
              <div className={styles.status_header}>
                <h4>배송대기</h4>
                <span>{deliveryWaitingItems.length}건</span>
              </div>
              {deliveryWaitingItems.length > 0 ? (
                <>
                  <div className={styles.status_card_list}>
                    {visibleDeliveryWaitingItems.map(renderSaleCard)}
                  </div>
                  {deliveryWaitingPageCount > 1 &&
                    renderPagination(
                      deliveryWaitingPage,
                      deliveryWaitingPageCount,
                      setDeliveryWaitingPage,
                    )}
                </>
              ) : (
                <p className={styles.empty_section}>
                  배송대기 상태 상품 없습니다.
                </p>
              )}
            </section>

            <section className={styles.sale_status_section}>
              <div className={styles.status_header}>
                <h4>판매완료</h4>
                <span>{completedItemsWithFallback.length}건</span>
              </div>
              {completedItemsWithFallback.length > 0 ? (
                <>
                  <div className={styles.status_card_list}>
                    {visibleCompletedItems.map(renderSaleCard)}
                  </div>
                  {completedPageCount > 1 &&
                    renderPagination(
                      completedPage,
                      completedPageCount,
                      setCompletedPage,
                    )}
                </>
              ) : (
                <p className={styles.empty_section}>
                  판매완료 내역이 없습니다.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default SaleHistory;
