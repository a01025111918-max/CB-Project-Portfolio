import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import { normalizeImageUrl, getSafeImageUrl } from "../../utils/getImageUrl";
import { compressImageFile } from "../../utils/compressImage";
import styles from "./PurchaseHistory.module.css";
import {
  removeCompletedPurchase,
  getCompletedPurchaseById,
} from "./orderHistoryStorage";

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

const getStatusPrefix = (status) => (status ? `[${status}] ` : "");

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

const getImageUrl = normalizeImageUrl;

const isDeliveryTrade = (tradeType, tradeTypeText, deliveryMethod, address) => {
  const normalized = String(
    tradeType ?? tradeTypeText ?? deliveryMethod ?? "",
  ).trim();
  const resolved = tradeTypeLabel(
    tradeType,
    tradeTypeText,
    deliveryMethod,
    address,
  );
  return resolved === "택배" || resolved === "직거래/택배";
};

const PurchaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { memberId: loginMemberId } = useAuthStore();
  const [item, setItem] = useState(null);
  const [isProcessingOrderAction, setIsProcessingOrderAction] = useState(false);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewImage, setReviewImage] = useState(null);
  const [reviewImageUrl, setReviewImageUrl] = useState("");
  const [reviews, setReviews] = useState([]);
  const [editReviewId, setEditReviewId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [editReviewImageUrl, setEditReviewImageUrl] = useState("");
  const [editReviewImage, setEditReviewImage] = useState(null);
  const [editOriginalReviewThumb, setEditOriginalReviewThumb] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const myReview = useMemo(
    () => reviews.find((rev) => rev.buyerId === loginMemberId),
    [reviews, loginMemberId],
  );

  // 디버깅용 콘솔 출력
  useEffect(() => {
    console.log("[구매상세 디버깅] item 전체:", item);
    console.log("[구매상세 디버깅] item.status:", item?.status);
    console.log("[구매상세 디버깅] item.tradeStatus:", item?.tradeStatus);
    console.log("[구매상세 디버깅] myReview:", myReview);
    console.log("[구매상세 디버깅] reviews:", reviews);
    console.log("[구매상세 디버깅] loginMemberId:", loginMemberId);
  }, [item, myReview, reviews, loginMemberId]);

  useEffect(() => {
    const fetchPurchaseDetail = async () => {
      if (!id || !loginMemberId) {
        setItem(null);
        return;
      }

      try {
        let response = null;
        const savedPurchase = getCompletedPurchaseById(id, loginMemberId);
        if (savedPurchase) {
          setItem(savedPurchase);
          return;
        }

        const numericId = !Number.isNaN(Number(id));
        if (numericId) {
          try {
            response = await axios.get(`${BACKSERVER}/api/store/trades/${id}`);
          } catch (err) {
            response = null;
          }
        }

        if ((!response || !response.data) && numericId) {
          try {
            response = await axios.get(
              `${BACKSERVER}/api/store/markets/${id}/trade-info`,
              {
                params: { buyerId: loginMemberId },
              },
            );
            if (!response.data) {
              response = await axios.get(
                `${BACKSERVER}/api/store/markets/${id}/trade-info`,
              );
            }
          } catch (err) {
            response = null;
          }
        }

        if (!response || !response.data) {
          if (numericId) {
            try {
              response = await axios.get(
                `${BACKSERVER}/api/store/boards/${id}`,
              );
            } catch (err) {
              response = null;
            }
          }
        }

        if (response && response.data) {
          console.log(
            "[구매상세 디버깅] fetchPurchaseDetail response:",
            response.data,
          );
          setItem(response.data);
        } else {
          console.log(
            "[구매상세 디버깅] fetchPurchaseDetail no response data",
            response,
          );
          setItem(null);
        }
      } catch (error) {
        console.error("구매 상세 조회 실패", error);
        setItem(null);
      }
    };

    fetchPurchaseDetail();
  }, [id, loginMemberId]);

  useEffect(() => {
    if (!item?.marketNo) return;

    const fetchTradeInfo = async () => {
      const url = `${BACKSERVER}/api/store/markets/${item.marketNo}/trade-info`;
      let response = null;

      try {
        response = await axios.get(url, {
          params: { buyerId: loginMemberId },
        });
      } catch (error) {
        response = null;
      }

      if ((!response || !response.data) && loginMemberId) {
        try {
          response = await axios.get(url);
        } catch (error) {
          response = null;
        }
      }

      if (response && response.data) {
        setItem((prev) => ({
          ...prev,
          orderInfo: {
            ...prev?.orderInfo,
            receiverName:
              response.data.receiverName || prev?.orderInfo?.receiverName,
            phone: response.data.buyerPhone || prev?.orderInfo?.phone,
            zipCode: response.data.zipCode || prev?.orderInfo?.zipCode,
            address: response.data.address || prev?.orderInfo?.address,
            addressDetail:
              response.data.addressDetail || prev?.orderInfo?.addressDetail,
            deliveryMemo:
              response.data.deliveryMemo || prev?.orderInfo?.deliveryMemo,
            deliveryMethod:
              response.data.deliveryMethod || prev?.orderInfo?.deliveryMethod,
          },
          tradeNo: response.data.tradeNo || prev?.tradeNo,
          tradeType: response.data.tradeType ?? prev?.tradeType,
          tradeTypeText: response.data.tradeTypeText ?? prev?.tradeTypeText,
          deliveryMethod: response.data.deliveryMethod ?? prev?.deliveryMethod,
          courierCode: response.data.courierCode ?? prev?.courierCode,
          shippingStatus: response.data.shippingStatus ?? prev?.shippingStatus,
          invoiceNumber: response.data.invoiceNumber ?? prev?.invoiceNumber,
        }));
      }
    };

    fetchTradeInfo();
  }, [item?.marketNo, loginMemberId]);

  useEffect(() => {
    if (!item?.marketNo) return;
    setIsLoading(true);
    axios
      .get(`${BACKSERVER}/api/store/markets/${item.marketNo}/ratings`)
      .then((res) => setReviews(Array.isArray(res.data) ? res.data : []))
      .catch((error) => {
        console.error("구매평가 조회 실패", error);
        setReviews([]);
      })
      .finally(() => setIsLoading(false));
  }, [item?.marketNo]);

  const onFileChange = async (e) => {
    let file = e.target.files[0];
    if (!file) return;
    setReviewImage(file);

    // 후기 이미지도 업로드 전에 압축해서 용량을 줄임
    if (file.type.startsWith("image/")) {
      file = await compressImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.75,
      });
    }

    const formData = new FormData();
    formData.append("upfile", file, file.name);

    try {
      const res = await axios.post(
        `${BACKSERVER}/boards/editor/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      const uploadedUrl = getSafeImageUrl(res.data, "board/editor");
      setReviewImageUrl(uploadedUrl || "");
    } catch (error) {
      console.error("후기 이미지 업로드 실패", error);
      alert("후기 이미지 업로드에 실패했습니다.");
      setReviewImage(null);
      setReviewImageUrl("");
    }
  };

  const onEditFileChange = async (e) => {
    let file = e.target.files[0];
    if (!file) return;
    setEditReviewImage(file);

    if (file.type.startsWith("image/")) {
      file = await compressImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.75,
      });
    }

    const formData = new FormData();
    formData.append("upfile", file, file.name);

    try {
      const res = await axios.post(
        `${BACKSERVER}/boards/editor/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      const uploadedUrl = getSafeImageUrl(res.data, "board/editor");
      setEditReviewImageUrl(uploadedUrl || "");
    } catch (error) {
      console.error("수정 중 후기 이미지 업로드 실패", error);
      alert("후기 이미지 업로드에 실패했습니다.");
      setEditReviewImage(null);
      setEditReviewImageUrl("");
    }
  };

  const handleOrderAction = async (actionType) => {
    if (!item?.marketNo || !item?.sellerId) {
      alert("상품 정보가 부족하여 처리할 수 없습니다.");
      return;
    }

    const isCancel = actionType === "cancel";
    const actionText = isCancel ? "결제 취소" : "환불";
    if (
      !window.confirm(
        `${actionText} 처리하면 구매내역에서 삭제되고 해당 상품은 판매중으로 돌아갑니다. 계속하시겠습니까?`,
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
          params: { status: 0, memberId: item.sellerId },
        },
      );

      const addressValue = item.orderInfo?.address || item.address || "";
      const originalTradeType = tradeTypeLabel(
        item.tradeType,
        item.tradeTypeText,
        item.deliveryMethod,
        addressValue,
      );
      const tradePayload = {
        tradeStatus: 0,
        shippingStatus: 0,
        tradeType: originalTradeType,
        tradeTypeText: originalTradeType,
        ctpvsggId: originalTradeType === "택배" ? null : item.ctpvsggId || null,
        receiverName: null,
        buyerPhone: null,
        zipCode: null,
        address: null,
        addressDetail: null,
        deliveryMemo: null,
        invoiceNumber: null,
        courierCode: null,
      };

      try {
        if (item.tradeNo) {
          await axios.patch(
            `${BACKSERVER}/api/store/trades/${item.tradeNo}`,
            tradePayload,
          );
        } else if (item.marketNo) {
          await axios.patch(
            `${BACKSERVER}/api/store/markets/${item.marketNo}/trade-info`,
            tradePayload,
          );
        }
      } catch (error) {
        console.warn("거래 정보 초기화 실패", error);
      }

      removeCompletedPurchase(item.id);
      alert(`${actionText} 처리되었습니다.`);
      navigate("/mypage/history/purchase");
    } catch (error) {
      console.error(`${actionText} 실패`, error);
      alert(error.response?.data || `${actionText} 처리에 실패했습니다.`);
    } finally {
      setIsProcessingOrderAction(false);
    }
  };

  const onSubmitReview = async () => {
    if (!comment.trim()) {
      alert("평가 내용을 작성해주세요.");
      return;
    }
    if (!loginMemberId) {
      alert("로그인 후 평가를 작성할 수 있습니다.");
      return;
    }
    try {
      const res = await axios.post(
        `${BACKSERVER}/api/store/markets/${item.marketNo}/ratings`,
        {
          tradeNo: item.tradeNo ?? null,
          marketNo: item.marketNo,
          sellerId: item.sellerId,
          buyerId: loginMemberId,
          buyerNickname: item.buyerNickname || loginMemberId,
          rating,
          reviewContent: comment,
          reviewThumb: reviewImageUrl || null,
        },
      );
      setReviews((prev) => [
        res.data,
        ...prev.filter((rev) => rev.reviewNo !== res.data.reviewNo),
      ]);
      alert("평가가 정상적으로 제출되었습니다.");
      setRating(5);
      setComment("");
      setReviewImage(null);
    } catch (error) {
      alert(error.response?.data || "평가 제출에 실패했습니다.");
    }
  };

  const startEditing = (review) => {
    setEditReviewId(review.reviewNo);
    setEditRating(review.rating);
    setEditComment(review.reviewContent);
    setEditOriginalReviewThumb(review.reviewThumb || "");
    setEditReviewImageUrl(review.reviewThumb || "");
  };

  const cancelEditing = () => {
    setEditReviewId(null);
    setEditRating(5);
    setEditComment("");
    setReviewImage(null);
    setReviewImageUrl("");
    setEditReviewImageUrl("");
    setEditReviewImage(null);
    setEditOriginalReviewThumb("");
  };

  const saveEdit = async () => {
    if (!editComment.trim()) {
      alert("평가 내용을 작성해주세요.");
      return;
    }
    try {
      await axios.put(
        `${BACKSERVER}/api/store/markets/${item.marketNo}/ratings/${editReviewId}`,
        {
          buyerId: loginMemberId,
          buyerNickname: item.buyerNickname || loginMemberId,
          rating: editRating,
          reviewContent: editComment,
          reviewThumb: editReviewImageUrl || editOriginalReviewThumb || null,
        },
      );
      setReviews((prev) =>
        prev.map((rev) =>
          rev.reviewNo === editReviewId
            ? {
                ...rev,
                rating: editRating,
                reviewContent: editComment,
                reviewThumb: editReviewImageUrl || rev.reviewThumb,
              }
            : rev,
        ),
      );
      cancelEditing();
      alert("평가가 수정되었습니다.");
    } catch (error) {
      alert(error.response?.data || "평가 수정에 실패했습니다.");
    }
  };

  const removeReview = async (reviewId) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      await axios.delete(
        `${BACKSERVER}/api/store/markets/${item.marketNo}/ratings/${reviewId}`,
        {
          params: { buyerId: loginMemberId },
        },
      );
      setReviews((prev) => prev.filter((rev) => rev.reviewNo !== reviewId));
    } catch (error) {
      alert(error.response?.data || "평가 삭제에 실패했습니다.");
    }
  };

  if (!item) {
    return (
      <div className={styles.purchase_history_wrap}>
        <p className={styles.purchase_title}>구매 상세를 찾을 수 없습니다.</p>
        <Link
          className={styles.purchase_back_link}
          to="/mypage/history/purchase"
        >
          구매내역으로 돌아가기
        </Link>
      </div>
    );
  }

  const addressValue = item.orderInfo?.address || item.address || "";
  const displayDeliveryMethod =
    item.deliveryMethod || item.orderInfo?.deliveryMethod;
  const displayTradeType = tradeTypeLabel(
    item.tradeType,
    item.tradeTypeText,
    displayDeliveryMethod,
    addressValue,
  );
  const isDelivery = isDeliveryTrade(
    item.tradeType,
    item.tradeTypeText,
    displayDeliveryMethod,
    addressValue,
  );
  const rawOrderAmount = Number(item.amount ?? item.tradePrice ?? 0);
  const explicitProductPrice = Number(
    item.productPrice ?? item.orderInfo?.productPrice ?? 0,
  );
  const explicitDeliveryFee = Number(
    item.deliveryFee ?? item.orderInfo?.deliveryFee ?? 0,
  );
  let inferredDeliveryFee = explicitDeliveryFee;
  if (displayTradeType === "택배") {
    if (inferredDeliveryFee <= 0) {
      if (rawOrderAmount > explicitProductPrice && explicitProductPrice > 0) {
        inferredDeliveryFee = rawOrderAmount - explicitProductPrice;
      } else {
        inferredDeliveryFee = 5000;
      }
    }
  }
  const productPrice =
    explicitProductPrice > 0
      ? explicitProductPrice
      : Math.max(rawOrderAmount - inferredDeliveryFee, 0);
  const totalAmount = rawOrderAmount;
  const shippingFeeLabel =
    inferredDeliveryFee > 0
      ? `${inferredDeliveryFee.toLocaleString("ko-KR")}원`
      : "무료";
  const shippingFeeStatus =
    inferredDeliveryFee > 0 ? "배송비 추가" : "배송비 없음";
  const shippingStatusValue =
    item.shippingStatus ?? item.orderInfo?.shippingStatus ?? 0;
  const shippingInfoAvailable =
    displayTradeType === "택배" ||
    item.orderInfo?.receiverName ||
    item.orderInfo?.phone ||
    item.orderInfo?.address ||
    item.invoiceNumber ||
    item.courierCode ||
    shippingStatusValue !== undefined;
  const isPurchaseComplete =
    item.status === "구매완료" || item.tradeStatus === 2;
  const showCancelButton = isPurchaseComplete && shippingStatusValue !== 1;
  const showRefundButton = isPurchaseComplete && shippingStatusValue === 1;

  return (
    <div className={styles.purchase_history_wrap}>
      <div className={styles.detail_header}>
        <h3 className={styles.purchase_title}>구매 상세</h3>
        <Link className={styles.detail_back_link} to="/mypage/history/purchase">
          ← 구매내역으로 돌아가기
        </Link>
      </div>
      <div className={styles.section_card}>
        <div className={styles.section_header}>
          <div>
            <div className={styles.section_title}>주문상품</div>
            <div className={styles.section_subtitle}>
              {getStatusPrefix(item.status)}
              {item.title}
            </div>
          </div>
          <div className={styles.section_tag}>{displayTradeType}</div>
        </div>
        <div className={styles.order_item_price}>
          상품금액 {productPrice.toLocaleString("ko-KR")}원
        </div>
        {displayTradeType === "택배" && (
          <div className={styles.order_item_shipping}>
            배송비 {shippingFeeLabel}
          </div>
        )}
        {(showCancelButton || showRefundButton) && (
          <div className={styles.order_actions_card}>
            {showCancelButton && (
              <button
                className="btn"
                disabled={isProcessingOrderAction}
                onClick={() => handleOrderAction("cancel")}
              >
                결제 취소
              </button>
            )}
            {showRefundButton && (
              <button
                className="btn"
                disabled={isProcessingOrderAction}
                onClick={() => handleOrderAction("refund")}
              >
                환불하기
              </button>
            )}
          </div>
        )}
      </div>
      <div className={styles.section_card}>
        <div className={styles.section_title}>배송지</div>
        <div className={styles.row}>
          <span>거래방법</span>
          <span>{displayTradeType}</span>
        </div>
        {isDelivery ? (
          <>
            <div className={styles.row}>
              <span>배송 상태</span>
              <span>{getShippingStatusLabel(item.shippingStatus)}</span>
            </div>
            <div className={styles.row}>
              <span>택배사</span>
              <span>{getCourierLabel(item.courierCode)}</span>
            </div>
            <div className={styles.row}>
              <span>송장번호</span>
              <span>{item.invoiceNumber || "-"}</span>
            </div>
          </>
        ) : (
          <div className={styles.row}>
            <span>배송 정보</span>
            <span>직거래</span>
          </div>
        )}
        <div className={styles.row}>
          <span>수령인</span>
          <span>{item.orderInfo?.receiverName || "-"}</span>
        </div>
        <div className={styles.row}>
          <span>연락처</span>
          <span>{item.orderInfo?.phone || item.buyerPhone || "-"}</span>
        </div>
        <div className={styles.row}>
          <span>주소</span>
          <span>
            {item.orderInfo?.address || "-"}{" "}
            {item.orderInfo?.addressDetail || ""}
          </span>
        </div>
      </div>
      <div className={styles.section_card}>
        <div className={styles.section_title}>결제정보</div>
        <div className={styles.payment_summary_header}>
          <span>주문금액</span>
          <strong>{Number(totalAmount).toLocaleString("ko-KR")}원</strong>
        </div>
        <div className={styles.summary_row}>
          <span>상품금액</span>
          <span>{productPrice.toLocaleString("ko-KR")}원</span>
        </div>
        {displayTradeType === "택배" && (
          <div className={styles.summary_row}>
            <span>배송비</span>
            <span>{shippingFeeLabel}</span>
          </div>
        )}
        <div className={styles.summary_row}>
          <span>총 결제금액</span>
          <strong>{Number(totalAmount).toLocaleString("ko-KR")}원</strong>
        </div>
        <div className={styles.summary_tag}>{shippingFeeStatus}</div>
      </div>

      {isPurchaseComplete && !myReview && (
        <div className={styles.review_area}>
          <h4>구매후기 작성</h4>
          <div className={styles.review_row}>
            <label>평가 점수 (1~5):</label>
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((v) => (
                <option key={v} value={v}>
                  {v}점
                </option>
              ))}
            </select>
          </div>
          <div className={styles.review_row}>
            <label>평가 내용:</label>
            <textarea
              className={styles.review_textarea}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="구매 경험에 대한 평가를 작성해주세요."
            />
          </div>
          <div className={styles.review_row}>
            <label>후기 사진 첨부 (선택):</label>
            <input type="file" accept="image/*" onChange={onFileChange} />
            {reviewImage && <span>{reviewImage.name}</span>}
          </div>
          {reviewImageUrl && (
            <div className={styles.review_image_wrap}>
              <img
                src={reviewImageUrl}
                alt="업로드된 후기 이미지 미리보기"
                className={styles.review_image}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
          <div className={styles.review_actions}>
            <button className="btn" onClick={onSubmitReview}>
              제출하기
            </button>
            <Link className="btn" to="/mypage/history/purchase">
              뒤로가기
            </Link>
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <div className={styles.review_area}>
          <h4>작성된 후기 {isLoading ? "불러오는 중..." : ""}</h4>
          {reviews.map((rev) => (
            <div key={rev.reviewNo} className={styles.purchase_card}>
              <div className={styles.purchase_card_title}>
                별점: {rev.rating}점
              </div>
              <div className={styles.purchase_card_meta}>
                {rev.createdAt
                  ? new Date(rev.createdAt).toLocaleString("ko-KR")
                  : "-"}
              </div>
              {editReviewId === rev.reviewNo ? (
                <div className={styles.review_edit_wrap}>
                  <div className={styles.review_row}>
                    <label>평가 점수:</label>
                    <select
                      value={editRating}
                      onChange={(e) => setEditRating(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>
                          {v}점
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    className={styles.review_textarea}
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                  />
                  <div className={styles.review_row}>
                    <label>후기 사진 변경 (선택):</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onEditFileChange}
                    />
                    {editReviewImage && <span>{editReviewImage.name}</span>}
                  </div>
                  {editReviewImageUrl && (
                    <div className={styles.review_image_wrap}>
                      <img
                        src={getSafeImageUrl(editReviewImageUrl)}
                        alt="수정 중인 후기 이미지"
                        className={styles.review_image}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div className={styles.review_actions}>
                    <button className="btn" onClick={saveEdit}>
                      저장
                    </button>
                    <button className="btn" onClick={cancelEditing}>
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p>{rev.reviewContent}</p>
                  {rev.reviewThumb &&
                    (() => {
                      const reviewImageUrl = getSafeImageUrl(rev.reviewThumb);
                      return reviewImageUrl ? (
                        <div className={styles.review_image_wrap}>
                          {/*
                          후기 이미지도 lazy loading을 적용함.
                          화면에 보여질 때만 다운로드하여 데이터 사용량을 줄임.
                        */}
                          <img
                            src={reviewImageUrl}
                            alt="후기 이미지"
                            className={styles.review_image}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      ) : null;
                    })()}
                  <div className={styles.review_actions}>
                    {rev.buyerId === loginMemberId && (
                      <>
                        <button
                          className="btn"
                          onClick={() => startEditing(rev)}
                        >
                          수정
                        </button>
                        <button
                          className="btn"
                          onClick={() => removeReview(rev.reviewNo)}
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PurchaseDetail;
