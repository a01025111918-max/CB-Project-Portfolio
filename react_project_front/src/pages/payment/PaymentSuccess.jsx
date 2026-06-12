// 토스 결제 성공 후 리다이렉트되는 테스트 완료 페이지입니다.
// 결제 완료 시 구매한 상품을 자동으로 "판매완료" 상태로 처리합니다.
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import styles from "./payment.module.css";
import {
  addCompletedPurchase,
  clearPendingPurchase,
  getPendingPurchase,
} from "../../components/mypage/orderHistoryStorage";

const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

const updateProductStatus = async (
  itemId,
  sellerId,
  shouldComplete = false,
) => {
  if (!sellerId) {
    console.warn(
      "판매자 아이디가 없어 상품 상태를 변경할 수 없습니다.",
      itemId,
    );
    return;
  }

  if (!shouldComplete) {
    // 택배 거래는 결제 이후에도 판매중 상태를 유지하며 배송대기 상태로 처리합니다.
    return;
  }

  try {
    await axios.patch(`${BACKSERVER}/api/store/boards/${itemId}/status`, null, {
      params: { status: 2, memberId: sellerId },
    });
  } catch (error) {
    console.error("상품 상태 업데이트 실패:", error);
  }
};

const normalizeTradeTypeText = (tradeType, deliveryMethod) => {
  const normalized = String(tradeType ?? "").trim();
  if (deliveryMethod === "delivery") return "택배";
  if (deliveryMethod === "direct") return "직거래";
  if (normalized === "0" || normalized === "직거래/택배") return "직거래/택배";
  if (normalized === "1" || normalized === "직거래") return "직거래";
  if (normalized === "2" || normalized === "택배") return "택배";
  return normalized || null;
};

const saveTradeInfo = async (order) => {
  if (!order?.marketNo || !order?.buyerId || !order?.sellerId) {
    return false;
  }

  const tradeTypeText = normalizeTradeTypeText(
    order.tradeType,
    order.deliveryMethod,
  );
  const tradeType =
    tradeTypeText ||
    (typeof order.tradeType === "string" ? order.tradeType : null);
  const isDelivery = tradeTypeText === "택배";
  const tradeStatus = isDelivery ? 1 : 2;
  const shippingStatus = isDelivery ? 0 : 1;

  try {
    await axios.post(`${BACKSERVER}/api/store/trades`, {
      marketNo: order.marketNo,
      sellerId: order.sellerId,
      buyerId: order.buyerId,
      buyerName: order.buyerNickname || order.buyerId,
      tradePrice: Number(order.amount || 0),
      tradeStatus,
      tradeType: tradeType,
      tradeTypeText,
      productPrice: Number(order.productPrice || order.baseAmount || 0),
      deliveryFee: Number(order.deliveryFee ?? (isDelivery ? 5000 : 0)),
      ctpvsggId: order.ctpvsggId || null,
      receiverName: order.orderInfo?.receiverName,
      buyerPhone: order.orderInfo?.phone,
      zipCode: order.orderInfo?.zipCode,
      address: order.orderInfo?.address,
      addressDetail: order.orderInfo?.addressDetail,
      deliveryMemo: order.orderInfo?.deliveryMemo,
      invoiceNumber: order.orderInfo?.invoiceNumber || null,
      courierCode: order.orderInfo?.courierCode || null,
      shippingStatus,
    });
    return true;
  } catch (error) {
    console.error("거래 정보 저장 실패:", error);
    return false;
  }
};

const PaymentSuccess = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const paymentKey = params.get("paymentKey");
  const orderId = params.get("orderId");
  const amount = params.get("amount");
  const marketNo =
    Number(params.get("marketNo")) || Number(params.get("itemId")) || null;
  const deliveryMethodParam = params.get("deliveryMethod");
  const order = orderId ? getPendingPurchase(orderId) : null;

  useEffect(() => {
    const processPaymentResult = async () => {
      if (!orderId || !order) return;

      const deliveryMethod = order.deliveryMethod || deliveryMethodParam;
      const tradeTypeText =
        order.tradeTypeText ||
        normalizeTradeTypeText(order.tradeType, deliveryMethod);
      const isDelivery = tradeTypeText === "택배";

      if (marketNo) {
        updateProductStatus(marketNo, order?.sellerId, !isDelivery);
      }

      const completedOrder = {
        ...order,
        deliveryMethod,
        tradeTypeText,
        productPrice: Number(order.productPrice || order.baseAmount || 0),
        deliveryFee: Number(order.deliveryFee || 0),
        ctpvsggId: order.ctpvsggId || null,
        status: "구매완료",
        date: new Date().toISOString(),
        paymentKey,
        amount: Number(amount || order.amount || 0),
      };

      const backendSaved = await saveTradeInfo(completedOrder);
      if (!backendSaved) {
        addCompletedPurchase(completedOrder);
      }
      clearPendingPurchase(orderId);
    };

    processPaymentResult();
  }, [amount, marketNo, order, orderId, paymentKey]);

  return (
    <section className={styles.payment_wrap}>
      <h1>결제 성공(테스트)</h1>
      <div className={styles.info_box}>
        <p>주문번호 : {orderId || "-"}</p>
        <p>
          결제금액 :{" "}
          {amount ? `${Number(amount).toLocaleString("ko-KR")}원` : "-"}
        </p>
      </div>
      <Link to="/store" className={styles.link_btn}>
        중고장터로 이동
      </Link>
    </section>
  );
};

export default PaymentSuccess;
