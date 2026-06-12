import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import { getSafeImageUrl } from "../../utils/getImageUrl";
import {
  getCompletedSaleByMarketNo,
  removeCompletedPurchaseByMarketNo,
} from "./orderHistoryStorage";
import styles from "./SaleHistory.module.css";
const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

const tradeTypeLabel = (type, text, deliveryMethod, address) => {
  const normalized = String(type ?? text ?? deliveryMethod ?? "").trim();
  const hasAddress = Boolean((address ?? "").toString().trim());

  if (normalized === "0" || normalized === "직거래/택배") {
    if (
      deliveryMethod === "delivery" ||
      deliveryMethod === "택배" ||
      hasAddress
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
  return hasAddress ? "택배" : "직거래";
};

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

const getTradeInfoStatusLabel = (tradeStatus) => {
  if (tradeStatus === 0 || tradeStatus === "0") return "요청";
  if (tradeStatus === 1 || tradeStatus === "1") return "진행중";
  if (tradeStatus === 2 || tradeStatus === "2") return "완료";
  if (tradeStatus === 3 || tradeStatus === "3") return "취소";
  if (tradeStatus === 4 || tradeStatus === "4") return "환불";
  return "-";
};

const getShippingStatusLabel = (shippingStatus) => {
  if (shippingStatus === 1 || shippingStatus === "1") return "배송완료";
  if (shippingStatus === 0 || shippingStatus === "0") return "배송대기";
  return "배송전";
};

const stripStatusTag = (title) => {
  if (!title) return "";
  return title.replace(/^\s*\[(판매중|거래중|판매완료|예약중)\]\s*/i, "");
};

const getCourierLabel = (code) => {
  if (code === 1 || code === "1") return "CJ대한통운";
  if (code === 2 || code === "2") return "현대택배";
  if (code === 3 || code === "3") return "한진택배";
  if (code === 4 || code === "4") return "로젠택배";
  if (code === 5 || code === "5") return "우체국택배";
  return "미지정";
};

const normalizeTradeType = (tradeType) => {
  if (tradeType === 0 || tradeType === "0" || tradeType === "직거래/택배")
    return "직거래/택배";
  if (tradeType === 1 || tradeType === "1" || tradeType === "직거래")
    return "직거래";
  if (tradeType === 2 || tradeType === "2" || tradeType === "택배")
    return "택배";
  return tradeType || null;
};

const SaleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { memberId } = useAuthStore();
  const [item, setItem] = useState(null);
  const [saleOrder, setSaleOrder] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [isProcessingOrderAction, setIsProcessingOrderAction] = useState(false);
  const [reviews, setReviews] = useState([]);

  const handleSellerOrderAction = async () => {
    if (!item?.marketNo || !saleOrder?.sellerId) {
      alert("해당 주문을 처리할 수 없습니다.");
      return;
    }

    const actionText = "주문 취소";
    if (
      !window.confirm(
        `${actionText} 처리하면 판매중으로 돌아갑니다. 계속하시겠습니까?`,
      )
    ) {
      return;
    }

    setIsProcessingOrderAction(true);
    try {
      await axios.patch(
        `${BACKSERVER}/api/store/boards/${item.marketNo}/status`,
        null,
        {
          params: { status: 0, memberId: saleOrder.sellerId },
        },
      );

      const originalTradeType = normalizeTradeType(
        item.tradeType || item.tradeTypeText,
      );
      const payload = {
        tradeStatus: 3,
        shippingStatus: 0,
        tradeType: originalTradeType,
        tradeTypeText: originalTradeType,
        ctpvsggId: originalTradeType === "택배" ? null : item.ctpvsggId || null,
        buyerId: null,
        buyerName: null,
        receiverName: null,
        buyerPhone: null,
        zipCode: null,
        address: null,
        addressDetail: null,
        deliveryMemo: null,
        invoiceNumber: null,
        courierCode: null,
      };

      if (saleOrder.tradeNo) {
        await axios.patch(
          `${BACKSERVER}/api/store/trades/${saleOrder.tradeNo}`,
          payload,
        );
      } else {
        await axios.patch(
          `${BACKSERVER}/api/store/markets/${item.marketNo}/trade-info`,
          payload,
        );
      }

      removeCompletedPurchaseByMarketNo(item.marketNo);
      alert(`${actionText} 처리되었습니다.`);
      navigate("/mypage/history/sale");
    } catch (error) {
      console.error(`${actionText} 실패`, error);
      alert(error.response?.data || `${actionText} 처리에 실패했습니다.`);
    } finally {
      setIsProcessingOrderAction(false);
    }
  };

  useEffect(() => {
    axios
      .get(`${BACKSERVER}/api/store/boards/${id}`)
      .then((res) => setItem(res.data))
      .catch((error) => {
        console.error("판매상세 조회 실패", error);
        setItem(null);
      });

    const fetchTradeInfo = async () => {
      try {
        const res = await axios.get(
          `${BACKSERVER}/api/store/markets/${id}/trade-info`,
        );
        if (res.data) {
          setSaleOrder((prev) => ({
            ...prev,
            ...res.data,
            tradeType: res.data.tradeType ?? prev?.tradeType,
            tradeTypeText: res.data.tradeTypeText ?? prev?.tradeTypeText,
            deliveryMethod: res.data.deliveryMethod ?? prev?.deliveryMethod,
            invoiceNumber: res.data.invoiceNumber || prev?.invoiceNumber,
          }));
          setInvoiceNumber(res.data.invoiceNumber || "");
          return;
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error("거래 정보 조회 실패", error);
        }
      }
      if (memberId) {
        const saved = getCompletedSaleByMarketNo(id, memberId);
        if (saved) {
          setSaleOrder(saved);
          setInvoiceNumber(saved?.invoiceNumber || "");
        }
      }
    };

    fetchTradeInfo();
  }, [id, memberId]);

  useEffect(() => {
    if (!id) return;
    axios
      .get(`${BACKSERVER}/api/store/markets/${id}/ratings`)
      .then((res) => setReviews(Array.isArray(res.data) ? res.data : []))
      .catch((error) => {
        console.error("판매후기 조회 실패", error);
        setReviews([]);
      });
  }, [id]);

  if (!item) {
    return (
      <div className={styles.sale_history_wrap}>
        <p className={styles.sale_title}>판매 상세를 찾을 수 없습니다.</p>
        <Link className={styles.sale_back_link} to="/mypage/history/sale">
          판매내역으로 돌아가기
        </Link>
      </div>
    );
  }
  const saleStatus =
    saleOrder?.tradeStatus != null
      ? getTradeInfoStatusLabel(saleOrder.tradeStatus)
      : getSaleStatusLabel(item.productStatus);
  const isSeller = saleOrder?.sellerId && saleOrder.sellerId === memberId;
  const itemAddress = item.orderInfo?.address || item.address || "";
  const defaultTradeMethod = tradeTypeLabel(
    item.tradeType,
    item.tradeTypeText,
    item.deliveryMethod,
    itemAddress,
  );
  const saleOrderAddress =
    saleOrder?.orderInfo?.address || saleOrder?.address || "";
  const tradeMethod = saleOrder
    ? tradeTypeLabel(
        saleOrder.tradeType,
        saleOrder.tradeTypeText,
        saleOrder.deliveryMethod,
        saleOrderAddress,
      )
    : defaultTradeMethod;
  const isDeliveryTrade =
    tradeMethod === "택배" || tradeMethod === "직거래/택배";
  const hasInvoice = Boolean(
    (saleOrder?.invoiceNumber ?? "").toString().trim(),
  );
  const hasShippingCompleted =
    saleOrder &&
    (saleOrder.shippingStatus === 1 || saleOrder.shippingStatus === "1") &&
    hasInvoice;
  const isDeliveryPending =
    saleOrder && isDeliveryTrade && !hasShippingCompleted && !hasInvoice;
  const shippingStatus = saleOrder
    ? isDeliveryPending
      ? "배송대기"
      : getShippingStatusLabel(saleOrder.shippingStatus)
    : isDeliveryTrade
      ? "배송대기"
      : "-";
  const rawOrderAmount = Number(
    saleOrder?.tradePrice ?? saleOrder?.amount ?? item.productPrice ?? 0,
  );
  const explicitProductPrice = Number(
    item.productPrice ?? saleOrder?.productPrice ?? 0,
  );
  const explicitDeliveryFee = Number(
    saleOrder?.deliveryFee ??
      saleOrder?.orderInfo?.deliveryFee ??
      item.deliveryFee ??
      0,
  );
  let inferredDeliveryFee = explicitDeliveryFee;
  if (tradeMethod === "택배") {
    if (inferredDeliveryFee <= 0) {
      if (rawOrderAmount > explicitProductPrice && explicitProductPrice > 0) {
        inferredDeliveryFee = rawOrderAmount - explicitProductPrice;
      } else {
        inferredDeliveryFee = 5000;
      }
    }
  }
  const totalAmount = rawOrderAmount;
  const productAmount =
    explicitProductPrice > 0
      ? explicitProductPrice
      : Math.max(totalAmount - inferredDeliveryFee, 0);
  const shippingFeeLabel =
    inferredDeliveryFee > 0
      ? `${inferredDeliveryFee.toLocaleString("ko-KR")}원`
      : "무료";
  const shippingFeeStatus =
    inferredDeliveryFee > 0 ? "배송비 추가" : "배송비 없음";
  const showSellerCancelButton = isSeller;

  return (
    <div className={styles.sale_history_wrap}>
      <div className={styles.detail_header}>
        <h3 className={styles.sale_title}>판매 상세</h3>
        <Link className={styles.detail_back_link} to="/mypage/history/sale">
          ← 판매내역으로 돌아가기
        </Link>
      </div>
      <div className={styles.section_card}>
        <div className={styles.section_header}>
          <div>
            <div className={styles.section_title}>주문상품</div>
            <div className={styles.section_subtitle}>
              [{saleStatus}] {stripStatusTag(item.marketTitle)}
            </div>
          </div>
          <div className={styles.section_tag}>{tradeMethod}</div>
        </div>
        <div className={styles.order_item_price}>
          상품금액 {productAmount.toLocaleString("ko-KR")}원
        </div>
        {tradeMethod === "택배" && (
          <div className={styles.order_item_shipping}>
            배송비 {shippingFeeLabel}
          </div>
        )}
        {saleOrder && (
          <>
            {isSeller && isDeliveryTrade && !saleOrder.invoiceNumber && (
              <div className={styles.order_actions_card}>
                <div className={styles.delivery_input_section}>
                  <label>
                    택배사 선택
                    <select
                      value={saleOrder.courierCode || ""}
                      onChange={(e) =>
                        setSaleOrder((prev) => ({
                          ...prev,
                          courierCode: Number(e.target.value),
                        }))
                      }
                    >
                      <option value="">택배사 선택</option>
                      <option value={1}>CJ대한통운</option>
                      <option value={2}>현대택배</option>
                      <option value={3}>한진택배</option>
                      <option value={4}>로젠택배</option>
                      <option value={5}>우체국택배</option>
                    </select>
                  </label>
                  <label>
                    송장번호 입력
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="송장번호를 입력하세요"
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.save_invoice_button}
                    disabled={
                      !invoiceNumber.trim() ||
                      !saleOrder.courierCode ||
                      isSubmittingInvoice
                    }
                    onClick={async () => {
                      const invoice = invoiceNumber.trim();
                      if (!invoice || !saleOrder.courierCode) return;
                      setIsSubmittingInvoice(true);
                      try {
                        const path = saleOrder.tradeNo
                          ? `${BACKSERVER}/api/store/trades/${saleOrder.tradeNo}`
                          : `${BACKSERVER}/api/store/markets/${id}/trade-info`;
                        const normalizedTradeType = normalizeTradeType(
                          saleOrder.tradeType ||
                            item.tradeType ||
                            item.tradeTypeText,
                        );
                        const ctpvsggId =
                          saleOrder.ctpvsggId || item.ctpvsggId || null;
                        if (normalizedTradeType !== "택배" && !ctpvsggId) {
                          alert(
                            "직거래/택배 거래의 경우 지역 정보(ctpvsggId)가 필요합니다.",
                          );
                          return;
                        }
                        await axios.patch(path, {
                          invoiceNumber: invoice,
                          courierCode: saleOrder.courierCode,
                          shippingStatus: 1,
                          tradeStatus: 2,
                          buyerId: saleOrder.buyerId,
                          sellerId: saleOrder.sellerId,
                          tradePrice:
                            saleOrder.tradePrice ||
                            Number(item.productPrice || 0),
                          tradeType: normalizedTradeType,
                          ctpvsggId:
                            normalizedTradeType === "택배"
                              ? null
                              : saleOrder.ctpvsggId || item.ctpvsggId || null,
                          receiverName:
                            saleOrder.orderInfo?.receiverName ||
                            saleOrder.receiverName,
                          buyerName:
                            saleOrder.buyerNickname ||
                            saleOrder.buyerName ||
                            saleOrder.buyerId,
                          buyerPhone:
                            saleOrder.orderInfo?.phone || saleOrder.buyerPhone,
                          zipCode:
                            saleOrder.orderInfo?.zipCode || saleOrder.zipCode,
                          address:
                            saleOrder.orderInfo?.address || saleOrder.address,
                          addressDetail:
                            saleOrder.orderInfo?.addressDetail ||
                            saleOrder.addressDetail,
                          deliveryMemo:
                            saleOrder.orderInfo?.deliveryMemo ||
                            saleOrder.deliveryMemo,
                        });
                        if (saleOrder.sellerId) {
                          await axios.patch(
                            `${BACKSERVER}/api/store/boards/${id}/status`,
                            null,
                            {
                              params: {
                                status: 2,
                                memberId: saleOrder.sellerId,
                              },
                            },
                          );
                        }
                        const res = await axios.get(
                          `${BACKSERVER}/api/store/markets/${id}/trade-info`,
                        );
                        setSaleOrder(res.data);
                        setInvoiceNumber(res.data.invoiceNumber || "");
                      } catch (error) {
                        console.error("송장번호 저장 실패", error);
                        alert(
                          error.response?.data ||
                            "송장번호 저장에 실패했습니다. 다시 시도해주세요.",
                        );
                      } finally {
                        setIsSubmittingInvoice(false);
                      }
                    }}
                  >
                    배송완료 처리
                  </button>
                </div>
              </div>
            )}
            {showSellerCancelButton && (
              <div className={styles.order_actions}>
                <button
                  className="btn"
                  disabled={isProcessingOrderAction}
                  onClick={handleSellerOrderAction}
                >
                  주문 취소하기
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <div className={styles.section_card}>
        <div className={styles.section_title}>구매자 정보 / 배송 정보</div>
        <div className={styles.row}>
          <span>구매자</span>
          <span>
            {saleOrder?.buyerNickname ||
              saleOrder?.buyerName ||
              saleOrder?.buyerId ||
              "-"}
          </span>
        </div>
        <div className={styles.row}>
          <span>거래방법</span>
          <span>{tradeMethod}</span>
        </div>
        {saleOrder && isDeliveryTrade ? (
          <>
            <div className={styles.row}>
              <span>배송 상태</span>
              <span>{shippingStatus}</span>
            </div>
            <div className={styles.row}>
              <span>택배사</span>
              <span>{getCourierLabel(saleOrder?.courierCode)}</span>
            </div>
            <div className={styles.row}>
              <span>송장번호</span>
              <span>{saleOrder?.invoiceNumber || "-"}</span>
            </div>
          </>
        ) : (
          <div className={styles.row}>
            <span>배송 정보</span>
            <span>
              {tradeMethod === "택배"
                ? "배송 대기"
                : tradeMethod === "직거래/택배"
                  ? "직거래/택배"
                  : "직거래"}
            </span>
          </div>
        )}
        <div className={styles.row}>
          <span>연락처</span>
          <span>
            {saleOrder?.orderInfo?.phone || saleOrder?.buyerPhone || "-"}
          </span>
        </div>
        <div className={styles.row}>
          <span>수령인</span>
          <span>
            {saleOrder?.orderInfo?.receiverName ||
              saleOrder?.receiverName ||
              "-"}
          </span>
        </div>
        <div className={styles.row}>
          <span>주소</span>
          <span>
            {saleOrder?.orderInfo?.address || saleOrder?.address || "-"}{" "}
            {saleOrder?.orderInfo?.addressDetail ||
              saleOrder?.addressDetail ||
              ""}
          </span>
        </div>
      </div>
      <div className={styles.section_card}>
        <div className={styles.section_title}>결제정보</div>
        <div className={styles.payment_summary_header}>
          <span>총 거래금액</span>
          <strong>{totalAmount.toLocaleString("ko-KR")}원</strong>
        </div>
        <div className={styles.summary_row}>
          <span>상품 금액</span>
          <span>{productAmount.toLocaleString("ko-KR")}원</span>
        </div>
        {tradeMethod === "택배" && (
          <div className={styles.summary_row}>
            <span>배송비</span>
            <span>{shippingFeeLabel}</span>
          </div>
        )}
        <div className={styles.summary_tag}>{shippingFeeStatus}</div>
      </div>
      {saleStatus === "판매완료" ? (
        <div className={styles.review_summary}>
          <h4>구매자 후기</h4>
          {reviews.length === 0 ? (
            <p>아직 등록된 후기가 없습니다.</p>
          ) : (
            reviews.map((rev) => {
              const imageUrl = getSafeImageUrl(rev.reviewThumb);
              return (
                <div key={rev.reviewNo} className={styles.review_card}>
                  <div className={styles.review_score}>★ {rev.rating}</div>
                  <div className={styles.review_meta}>
                    {rev.buyerNickname || rev.buyerId} ·{" "}
                    {rev.createdAt
                      ? new Date(rev.createdAt).toLocaleDateString("ko-KR")
                      : "-"}
                  </div>
                  <p>{rev.reviewContent}</p>
                  {imageUrl && (
                    <div className={styles.review_image_wrap}>
                      <img
                        src={imageUrl}
                        alt="구매자 후기 이미지"
                        className={styles.review_image}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className={styles.review_summary}>
          <h4>구매자 후기</h4>
          <p>판매완료 상태에서만 구매자 후기를 확인할 수 있습니다.</p>
        </div>
      )}
    </div>
  );
};

export default SaleDetail;
