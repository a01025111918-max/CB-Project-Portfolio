import React, { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import useAuthStore from "../../../store/useAuthStore";
import { normalizeImageUrl, getSafeImageUrl } from "../../../utils/getImageUrl";
import userImg from "../../../assets/user.png";
import styles from "./storeDetail.module.css";
import storeStyles from "./store.module.css";

const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";
const DELIVERY_FEE = 5000;

const formatPrice = (value) =>
  `${Number(value || 0).toLocaleString("ko-KR")}원`;
const parsePriceToNumber = (value) =>
  Number(String(value || "").replace(/[^0-9]/g, "")) || 0;
const normalizeTradeType = (tradeType) => {
  if (
    tradeType === 0 ||
    tradeType === "0" ||
    tradeType === "직거래/택배" ||
    String(tradeType).trim() === "직거래/택배"
  )
    return "직거래/택배";
  if (
    tradeType === 1 ||
    tradeType === "1" ||
    tradeType === "직거래" ||
    String(tradeType).trim() === "직거래"
  )
    return "직거래";
  if (
    tradeType === 2 ||
    tradeType === "2" ||
    tradeType === "택배" ||
    String(tradeType).trim() === "택배"
  )
    return "택배";
  return null;
};

const getTradeTypeLabel = (tradeType) => {
  const normalized = normalizeTradeType(tradeType);
  return normalized || "미정";
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

// 스토어 댓글 비공개 플래그를 일관되게 해석합니다.
// 백엔드에서 숫자 1, 문자열 "1", 또는 true 같은 다양한 값이 올 수 있기 때문에,
// 모두 비공개 댓글로 처리하도록 통일합니다.
const isSecretComment = (comment) =>
  comment?.isPrivate === 1 ||
  comment?.isPrivate === "1" ||
  comment?.isPrivate === true;

// 댓글 목록을 받아서 비공개 여부 필드를 boolean으로 정규화합니다.
// 이후 렌더링 시 항상 동일한 조건으로 비공개 댓글을 처리할 수 있습니다.
const normalizeComments = (rawComments) =>
  (Array.isArray(rawComments) ? rawComments : []).map((comment) => ({
    ...comment,
    isPrivate: isSecretComment(comment),
  }));

// 중고거래 상세 페이지임.
//  - 선택한 중고 상품의 상세 정보를 불러와서 보여줌.
//  - 찜하기 버튼으로 관심 상품에 추가할 수 있음.
//  - 댓글 작성, 답글 달기, 댓글 수정, 댓글 삭제, 댓글 신고 기능을 지원함.
//  - 거래 후기와 판매자 평점을 함께 보여줌.
const StoreDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const itemId = Number(id);
  const { memberId, memberNickname, memberThumb } = useAuthStore();
  const [item, setItem] = useState(null);
  const [storeList, setStoreList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [comments, setComments] = useState([]);
  const [reportedCommentIds, setReportedCommentIds] = useState({});
  const [transactionReviews, setTransactionReviews] = useState([]);
  const [sellerRatings, setSellerRatings] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [newCommentPrivate, setNewCommentPrivate] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingTarget, setEditingTarget] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [editingPrivate, setEditingPrivate] = useState(false);

  const getDisplayName = (user) => {
    const name =
      user?.writerNickname?.trim() ||
      user?.memberNickname?.trim() ||
      user?.buyerNickname?.trim() ||
      user?.sellerNickname?.trim() ||
      user?.memberName?.trim() ||
      user?.writerName?.trim();
    if (!name || ["null", "undefined"].includes(name.toLowerCase())) {
      return (
        user?.memberId ||
        user?.writerId ||
        user?.buyerId ||
        user?.sellerId ||
        ""
      );
    }
    return name;
  };
  const [saleStatus, setSaleStatus] = useState("판매중");
  const [deliveryMethod, setDeliveryMethod] = useState("");
  const [isCartLoading, setIsCartLoading] = useState(false);

  // 찜하기 기능임.
  //  - 로그인한 사용자만 찜할 수 있음.
  //  - 상품을 찜한 상품 목록에 추가하는 API를 호출함.
  //  - 성공하면 성공 메시지를 보여주고, 실패하면 오류 메시지를 보여줌.
  const handleAddToCart = async () => {
    if (!memberId) {
      Swal.fire({
        icon: "info",
        title: "로그인 필요",
        text: "찜하기 위해 로그인해주세요.",
      });
      return;
    }
    if (!item?.marketNo) {
      Swal.fire({
        icon: "error",
        title: "오류",
        text: "상품 정보를 찾을 수 없습니다.",
      });
      return;
    }

    try {
      setIsCartLoading(true);
      await axios.post(`${BACKSERVER}/api/store/cart`, {
        memberId,
        marketNo: item.marketNo,
        quantity: 1,
      });
      Swal.fire({
        icon: "success",
        title: "찜하기 완료",
        text: "상품이 찜한 상품에 추가되었습니다.",
      });
    } catch (error) {
      console.error("찜하기 실패", error);
      Swal.fire({
        icon: "error",
        title: "찜하기 실패",
        text: error.response?.data || "상품을 찜하는 중 오류가 발생했습니다.",
      });
    } finally {
      setIsCartLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        await axios.get(`${BACKSERVER}/api/store/boards/${itemId}/read`);
        const [detailResponse, listResponse, commentsResponse] =
          await Promise.all([
            axios.get(`${BACKSERVER}/api/store/boards/${itemId}`),
            axios.get(`${BACKSERVER}/api/store/boards`),
            axios.get(`${BACKSERVER}/api/store/boards/${itemId}/reviews`),
          ]);
        setItem(detailResponse.data);
        setStoreList(Array.isArray(listResponse.data) ? listResponse.data : []);
        // 댓글을 불러올 때마다 비공개 플래그를 정규화하여
        // 렌더링 시 올바르게 "비공개 댓글" 처리가 되도록 합니다.
        setComments(normalizeComments(commentsResponse.data));
        setLoadError("");
      } catch (error) {
        console.error("중고장터 상세 조회 실패", error);
        setLoadError("상품 정보를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    if (Number.isNaN(itemId)) {
      setLoadError("잘못된 접근입니다.");
      setIsLoading(false);
      return;
    }

    fetchData();
  }, [itemId]);

  useEffect(() => {
    if (!itemId) return;
    axios
      .get(`${BACKSERVER}/api/store/markets/${itemId}/ratings`)
      .then((res) =>
        setTransactionReviews(Array.isArray(res.data) ? res.data : []),
      )
      .catch((error) => {
        console.error("거래 후기 조회 실패", error);
        setTransactionReviews([]);
      });
  }, [itemId]);

  useEffect(() => {
    if (!item) return;
    setSaleStatus(getSaleStatusLabel(item.productStatus));
  }, [item]);

  // 상세페이지 로딩 시 작성자 썸네일이 비어 있으면 회원 API에서 추가로 가져와서 채워줌.
  useEffect(() => {
    if (!item || item.memberThumb) return;
    if (!item.memberId) return;

    axios
      .get(`${BACKSERVER}/api/members/${item.memberId}`)
      .then((res) => {
        if (res.data?.memberThumb) {
          setItem((prev) =>
            prev ? { ...prev, memberThumb: res.data.memberThumb } : prev,
          );
        }
      })
      .catch((error) => {
        console.debug("판매자 썸네일 조회 실패", item.memberId, error);
      });
  }, [item]);

  useEffect(() => {
    const sellerId = item?.memberId || item?.sellerId;
    if (!sellerId) return;

    axios
      .get(`${BACKSERVER}/api/store/sellers/${sellerId}/ratings`)
      .then((res) => setSellerRatings(Array.isArray(res.data) ? res.data : []))
      .catch((error) => {
        console.error("판매자 평점 조회 실패", error);
        setSellerRatings([]);
      });
  }, [item]);

  const totalSellerRatingScore = useMemo(() => {
    return sellerRatings.reduce(
      (sum, rating) => sum + Number(rating.rating || 0),
      0,
    );
  }, [sellerRatings]);

  const itemTradeSetting = useMemo(() => {
    if (!item) return { direct: true, delivery: true };
    const normalizedTradeType = normalizeTradeType(item.tradeType);
    if (normalizedTradeType === "직거래/택배")
      return { direct: true, delivery: true };
    if (normalizedTradeType === "직거래")
      return { direct: true, delivery: false };
    if (normalizedTradeType === "택배")
      return { direct: false, delivery: true };
    return { direct: true, delivery: true };
  }, [item]);

  const getImageUrl = normalizeImageUrl;

  const getMemberImageUrl = (thumb) => normalizeImageUrl(thumb, "member/thumb");

  const [supportDirect, setSupportDirect] = useState(true);
  const [supportDelivery, setSupportDelivery] = useState(true);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    setSupportDirect(itemTradeSetting.direct);
    setSupportDelivery(itemTradeSetting.delivery);

    if (itemTradeSetting.direct && !itemTradeSetting.delivery) {
      setDeliveryMethod("direct");
    } else if (!itemTradeSetting.direct && itemTradeSetting.delivery) {
      setDeliveryMethod("delivery");
    } else {
      setDeliveryMethod("");
    }
  }, [itemTradeSetting]);

  const formatCommentDate = (rawDate) => {
    if (!rawDate) return "방금 전";
    const date = new Date(rawDate);
    const diff = Date.now() - date.getTime();
    const minute = Math.floor(diff / 60000);
    if (minute < 1) return "방금 전";
    if (minute < 60) return `${minute}분 전`;
    const hour = Math.floor(minute / 60);
    if (hour < 24) return `${hour}시간 전`;
    const day = Math.floor(hour / 24);
    return `${day}일 전`;
  };

  const formatCommentDateTime = (rawDate) => {
    if (!rawDate) return "";
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const formatDateTime = (rawDate) => {
    return formatCommentDateTime(rawDate);
  };

  const isCommentEdited = (comment) => {
    return comment?.updatedAt && comment.updatedAt !== comment.createdAt;
  };

  const refreshComments = async () => {
    try {
      const response = await axios.get(
        `${BACKSERVER}/api/store/boards/${itemId}/reviews`,
      );
      // 댓글 목록을 새로고침할 때에도 비공개 플래그를 일관되게 유지합니다.
      setComments(normalizeComments(response.data));
    } catch (error) {
      console.error("댓글 목록 조회 실패", error);
    }
  };

  // 댓글 작성 기능임.
  //  - 로그인한 사용자만 댓글을 작성할 수 있음.
  //  - 답글을 작성할 때 parentCommentNo를 함께 서버에 저장함.
  //  - 등록 후 댓글 목록을 새로고침해서 최신 댓글을 보여줌.
  const handleAddComment = async () => {
    if (!memberId) {
      Swal.fire({
        icon: "warning",
        title: "로그인이 필요합니다",
        text: "댓글을 작성하려면 로그인 후 이용해주세요.",
        confirmButtonText: "확인",
        confirmButtonColor: "#464d3e",
      });
      return;
    }

    const text = newComment.trim();
    if (!text) return;

    try {
      await axios.post(`${BACKSERVER}/api/store/boards/${itemId}/reviews`, {
        reviewContent: text,
        memberId,
        memberNickname,
        isPrivate: newCommentPrivate ? 1 : 0,
        parentCommentNo: replyTarget?.reviewNo || null,
      });
      setNewComment("");
      setNewCommentPrivate(false);
      setReplyTarget(null);
      await refreshComments();
    } catch (error) {
      console.error("댓글 등록 실패", error);
      Swal.fire({
        icon: "error",
        title: "댓글 등록 실패",
        text: "댓글을 등록하지 못했습니다.",
        confirmButtonColor: "#464d3e",
      });
    }
  };

  // 댓글 삭제 확인창 추가
  // 이전에는 삭제 버튼 클릭 시 바로 삭제 API를 호출했을 수 있으므로,
  // 사용자가 삭제 여부를 확실히 선택하도록 확인창을 띄웁니다.
  const handleDeleteComment = async (comment) => {
    if (!memberId || memberId !== comment.memberId) return;
    const result = await Swal.fire({
      icon: "warning",
      title: "댓글 삭제",
      text: "정말 이 댓글을 삭제하시겠습니까?",
      showCancelButton: true,
      confirmButtonText: "삭제",
      cancelButtonText: "취소",
      confirmButtonColor: "#c0392b",
      cancelButtonColor: "#8c9482",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(
        `${BACKSERVER}/api/store/boards/${itemId}/reviews/${comment.reviewNo}`,
        {
          params: { memberId },
        },
      );
      await refreshComments();
    } catch (error) {
      console.error("댓글 삭제 실패", error);
      Swal.fire({
        icon: "error",
        title: "삭제 실패",
        text: "댓글을 삭제하지 못했습니다.",
        confirmButtonColor: "#464d3e",
      });
    }
  };

  const startReplyToComment = (comment) => {
    if (!memberId) {
      Swal.fire({
        icon: "warning",
        title: "로그인이 필요합니다",
        text: "답글을 작성하려면 로그인 후 이용해주세요.",
        confirmButtonText: "확인",
        confirmButtonColor: "#464d3e",
      });
      return;
    }
    setReplyTarget(comment);
    setNewComment(`@${getDisplayName(comment)} `);
    setNewCommentPrivate(false);
  };

  const cancelReply = () => {
    setReplyTarget(null);
    setNewComment("");
    setNewCommentPrivate(false);
  };

  const startEditComment = (comment) => {
    if (!memberId || memberId !== comment.memberId) return;
    setEditingTarget(comment);
    setEditingText(comment.reviewContent || "");
    // 수정 모드에서도 비공개 상태를 정확히 유지하기 위해
    // 정규화된 isSecretComment() 값을 사용합니다.
    setEditingPrivate(isSecretComment(comment));
  };

  const cancelEdit = () => {
    setEditingTarget(null);
    setEditingText("");
    setEditingPrivate(false);
  };

  // 댓글 수정 처리
  // 수정 버튼 클릭 시 서버에 수정 내용을 저장하고, 목록을 새로 고침합니다.
  const saveEditComment = async () => {
    if (!editingTarget) return;
    const text = editingText.trim();
    if (!text) return;

    try {
      await axios.put(
        `${BACKSERVER}/api/store/boards/${itemId}/reviews/${editingTarget.reviewNo}`,
        {
          reviewContent: text,
          memberId,
          memberNickname,
          isPrivate: editingPrivate ? 1 : 0,
        },
      );
      setEditingTarget(null);
      setEditingText("");
      setEditingPrivate(false);
      await refreshComments();
    } catch (error) {
      console.error("댓글 수정 실패", error);
      Swal.fire({
        icon: "error",
        title: "댓글 수정 실패",
        text: "댓글을 수정하지 못했습니다.",
        confirmButtonColor: "#464d3e",
      });
    }
  };

  if (!item) {
    return (
      <section className={styles.detail_wrap}>
        <h1>중고장터</h1>
        <p>
          {isLoading
            ? "상품 정보를 불러오는 중입니다."
            : loadError || "해당 상품을 찾을 수 없습니다."}
        </p>
        <Link to="/store" className={styles.back_link}>
          ← 목록으로 돌아가기
        </Link>
      </section>
    );
  }

  const sameProducts = storeList.filter(
    (product) =>
      product.marketTitle === item.marketTitle &&
      product.marketNo !== item.marketNo,
  );
  const displaySame =
    sameProducts.length > 0
      ? sameProducts.slice(0, 6)
      : storeList
          .filter((product) => product.marketNo !== item.marketNo)
          .slice(0, 6);
  const displayTitle = `[${saleStatus}] ${item.marketTitle}`;
  const isAuthor = memberId && item?.memberId === memberId;

  const updateProductStatus = async (statusCode) => {
    try {
      await axios.patch(
        `${BACKSERVER}/api/store/boards/${itemId}/status`,
        null,
        {
          params: { status: statusCode, memberId },
        },
      );
    } catch (error) {
      console.error("상품 상태 업데이트 실패", error);
      throw error;
    }
  };

  const getStatusCode = (status) => {
    if (status === "예약중") return 1;
    if (status === "판매완료") return 2;
    return 0;
  };

  const handleChangeSaleStatus = async (status) => {
    if (!isAuthor) {
      Swal.fire({
        icon: "warning",
        title: "작성자만 상태를 변경할 수 있습니다.",
      });
      return;
    }

    const isCancelAction = saleStatus === status;
    const nextStatus = isCancelAction ? "판매중" : status;
    const confirmText = isCancelAction
      ? `[${status}] 상태를 해제하고 [판매중]으로 변경하시겠습니까?`
      : `[${status}] 상태로 변경하시겠습니까?`;

    const result = await Swal.fire({
      icon: "question",
      title: "상태 변경",
      text: confirmText,
      showCancelButton: true,
      confirmButtonText: "확인",
      cancelButtonText: "취소",
      confirmButtonColor: "#464d3e",
      cancelButtonColor: "#8c9482",
    });

    if (!result.isConfirmed) return;

    try {
      await updateProductStatus(getStatusCode(nextStatus));
      setSaleStatus(nextStatus);
      setItem((prev) => ({ ...prev, productStatus: nextStatus }));

      Swal.fire({
        icon: "success",
        title: "변경 완료",
        text: `[${nextStatus}] 상태로 변경되었습니다.`,
        confirmButtonColor: "#464d3e",
      });
    } catch {
      Swal.fire({
        icon: "error",
        title: "변경 실패",
        text: "상품 상태를 변경하지 못했습니다.",
        confirmButtonColor: "#464d3e",
      });
    }
  };

  const handleGoToPayment = () => {
    if (!deliveryMethod) {
      Swal.fire({
        icon: "warning",
        title: "거래방법을 선택해주세요",
        text: "택배 또는 직거래 중 하나를 선택하셔야 합니다.",
        confirmButtonColor: "#464d3e",
      });
      return;
    }

    const baseAmount = parsePriceToNumber(item.productPrice);
    const finalAmount =
      deliveryMethod === "delivery" ? baseAmount + DELIVERY_FEE : baseAmount;
    navigate("/payment/order", {
      state: {
        itemId,
        marketNo: item.marketNo,
        orderName: item.marketTitle,
        amount: finalAmount,
        deliveryMethod,
        baseAmount,
        deliveryFee: deliveryMethod === "delivery" ? DELIVERY_FEE : 0,
        sellerId: item.memberId,
        sellerNickname: item.memberNickname,
        tradeType: item.tradeType,
        ctpvsggId: item.ctpvsggId || null,
        productThumb: item.productThumb,
      },
    });
  };

  // 게시글 신고 기능임.
  //  - 사용자가 해당 상품 게시글이 규정에 어긋난다고 판단하면 신고 요청을 함.
  //  - 여기서는 화면에서 신고 완료 메시지를 보여주는 방식으로 처리함.
  const handleReport = async () => {
    const result = await Swal.fire({
      icon: "warning",
      title: "신고하기",
      text: "해당 게시글을 신고하시겠습니까?",
      showCancelButton: true,
      confirmButtonText: "신고",
      cancelButtonText: "취소",
      confirmButtonColor: "#c0392b",
    });

    if (result.isConfirmed) {
      setReported(true);
      Swal.fire({ icon: "success", title: "신고 접수되었습니다." });
    }
  };

  // 댓글 신고 기능임.
  //  - 댓글이 규정에 어긋나거나 불쾌할 때 신고할 수 있도록 함.
  //  - 신고 후에는 화면에서 신고 완료 상태를 유지함.
  const handleReportComment = async (commentId) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "댓글 신고하기",
      text: "이 댓글을 신고하시겠습니까?",
      showCancelButton: true,
      confirmButtonText: "신고",
      cancelButtonText: "취소",
      confirmButtonColor: "#c0392b",
    });

    if (result.isConfirmed) {
      setReportedCommentIds((prev) => ({ ...prev, [commentId]: true }));
      Swal.fire({ icon: "success", title: "신고 접수되었습니다." });
    }
  };

  const handleEdit = () => {
    if (!isAuthor) {
      Swal.fire({ icon: "warning", title: "작성자만 수정할 수 있습니다." });
      return;
    }
    navigate("/store/register", { state: { editItem: item } });
  };

  const handleDelete = async () => {
    if (!isAuthor) {
      Swal.fire({ icon: "warning", title: "작성자만 삭제할 수 있습니다." });
      return;
    }
    const result = await Swal.fire({
      icon: "warning",
      title: "게시글 삭제",
      text: "정말 이 상품을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.",
      showCancelButton: true,
      confirmButtonText: "삭제",
      cancelButtonText: "취소",
      confirmButtonColor: "#c0392b",
      cancelButtonColor: "#8c9482",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${BACKSERVER}/api/store/boards/${itemId}`, {
        params: { memberId },
      });
      await Swal.fire({
        icon: "success",
        title: "삭제 완료",
        text: "상품이 삭제되었습니다.",
        confirmButtonColor: "#464d3e",
      });
      navigate("/store");
    } catch (error) {
      console.error("상품 삭제 실패", error);
      Swal.fire({
        icon: "error",
        title: "삭제 실패",
        text: "상품을 삭제하지 못했습니다.",
        confirmButtonColor: "#464d3e",
      });
    }
  };

  return (
    <section className={styles.detail_wrap}>
      <div className={styles.detail_header}>
        <h1>{displayTitle}</h1>
        <Link to="/store" className={styles.back_link}>
          ← 목록으로 돌아가기
        </Link>
      </div>

      <div className={styles.detail_top}>
        <div className={styles.detail_image_box}>
          <div className={styles.image}>
            {(() => {
              const imageUrl = getImageUrl(item.productThumb);
              if (imageUrl) {
                return (
                  <img
                    src={getImageUrl(item.productThumb) || "/no-image.svg"}
                    alt={item.marketTitle || "상품 이미지"}
                    className={styles.product_image}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/no-image.svg";
                    }}
                  />
                );
              }
              return item.productThumb || "상품 이미지";
            })()}
          </div>
        </div>

        <div className={styles.detail_summary}>
          <div className={styles.detail_summary_top}>
            <p className={styles.price}>{formatPrice(item.productPrice)}</p>
            {!isAuthor && (
              <button
                type="button"
                className={`${styles.report_icon_button} ${reported ? styles.reported : ""}`}
                onClick={handleReport}
                title={reported ? "신고 완료" : "신고하기"}
              >
                <span className="material-icons">
                  {reported ? "report" : "report_gmailerrorred"}
                </span>
              </button>
            )}
          </div>
          <div className={styles.region_badge}>
            {item.regionName || item.ctpvsggId || "미등록"}
          </div>
          <div className={styles.authorRow}>
            <img
              className={styles.authorAvatar}
              src={
                getMemberImageUrl(
                  item.memberThumb ||
                    (item.memberId === memberId ? memberThumb : null),
                ) || userImg
              }
              alt="작성자 프로필"
              onError={(e) => {
                e.currentTarget.src = userImg;
              }}
            />
            <span>{getDisplayName(item)}</span>
          </div>
          <p>조회수 : {item.readCount || 0}</p>
          <p>댓글 : {comments.length}</p>
          {(item.updatedAt || item.updateAt) &&
            (item.updatedAt || item.updateAt) !== item.createdAt && (
              <p>수정됨 · {formatDateTime(item.updatedAt || item.updateAt)}</p>
            )}

          <p>거래방법 : {getTradeTypeLabel(item.tradeType)}</p>

          <div className={styles.delivery_box}>
            <p>거래방법 선택 :</p>
            <div className={styles.delivery_options}>
              <label
                className={
                  supportDirect
                    ? styles.delivery_option
                    : `${styles.delivery_option} ${styles.disabledOption}`
                }
              >
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="direct"
                  checked={deliveryMethod === "direct"}
                  onChange={() => setDeliveryMethod("direct")}
                  disabled={!supportDirect}
                />
                직거래
              </label>
              <label
                className={
                  supportDelivery
                    ? styles.delivery_option
                    : `${styles.delivery_option} ${styles.disabledOption}`
                }
              >
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="delivery"
                  checked={deliveryMethod === "delivery"}
                  onChange={() => setDeliveryMethod("delivery")}
                  disabled={!supportDelivery}
                />
                택배배송 (배송비 {DELIVERY_FEE.toLocaleString("ko-KR")}원)
              </label>
            </div>
            {!deliveryMethod && supportDirect && supportDelivery && (
              <p
                style={{ marginTop: 8, color: "#5a5a5a", fontSize: "0.95rem" }}
              >
                양쪽 거래가 가능할 때는 먼저 거래방법을 선택해주세요.
              </p>
            )}
          </div>

          <div className={styles.info_box}>
            상품 상태 : {item.productStatus || "미등록"}
          </div>

          {isAuthor ? (
            <div className={styles.action_row}>
              <button
                type="button"
                className={`${styles.statusButton} ${saleStatus === "예약중" ? styles.statusButtonActive : ""}`}
                onClick={() => handleChangeSaleStatus("예약중")}
                disabled={saleStatus === "판매완료"}
              >
                {saleStatus === "예약중"
                  ? "판매중으로 변경"
                  : "예약중으로 변경"}
              </button>
              <button
                type="button"
                className={styles.edit_button}
                onClick={handleEdit}
                disabled={saleStatus === "판매완료"}
              >
                수정
              </button>
              <button
                type="button"
                className={styles.delete_button}
                onClick={handleDelete}
                disabled={saleStatus === "판매완료"}
              >
                삭제
              </button>
            </div>
          ) : null}
          {!isAuthor && (
            <div className={styles.button_group}>
              {saleStatus !== "판매완료" && (
                <>
                  <button
                    type="button"
                    className={styles.cart_button}
                    onClick={handleAddToCart}
                    disabled={isCartLoading}
                  >
                    🛒 찜하기
                  </button>
                  <button
                    type="button"
                    className={styles.buy_button}
                    onClick={handleGoToPayment}
                  >
                    구매하기
                  </button>
                </>
              )}
            </div>
          )}
          {saleStatus === "판매완료" && isAuthor && (
            <div className={styles.info_box}>
              이 상품은 결제 완료 처리되어 더 이상 수정/삭제할 수 없습니다.
            </div>
          )}
        </div>
      </div>

      <div className={styles.section_box}>
        <h3>상품정보</h3>
        <p className={styles.productContent}>
          {item.marketContent || `${item.marketTitle} 상품 상세 안내 ...`}
        </p>
      </div>

      <div className={styles.section_box}>
        <h3>가게 정보</h3>
        <p>상점명 : {getDisplayName(item)} 상점</p>
        <p>신뢰지수 : {totalSellerRatingScore}점</p>
        <p>거래후기 : {sellerRatings.length}</p>
      </div>

      {saleStatus === "판매완료" && (
        <div className={styles.comment_section}>
          <h3>거래 후기</h3>
          <div className={styles.comment_list}>
            {transactionReviews.length === 0 && (
              <p>등록된 거래 후기가 없습니다.</p>
            )}
            {transactionReviews.map((comment) => {
              const imageUrl = getSafeImageUrl(comment.reviewThumb);
              return (
                <div
                  key={comment.reviewNo}
                  className={styles.comment_item}
                  style={{
                    marginLeft: `${(comment.commentDepth || 0) * 20}px`,
                  }}
                >
                  <div className={styles.review_header}>
                    <span className={styles.review_author}>
                      {getDisplayName(comment)}
                    </span>
                    <span className={styles.review_score}>
                      ★ {comment.rating ?? 0}점
                    </span>
                  </div>
                  <p className={styles.comment_meta}>
                    {formatCommentDate(comment.createdAt)}
                  </p>
                  <p className={styles.comment_text}>{comment.reviewContent}</p>
                  {imageUrl && (
                    <div className={styles.review_image_wrap}>
                      <img
                        className={styles.review_image}
                        src={imageUrl}
                        alt="거래 후기 이미지"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "/no-image.svg";
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.same_items_section}>
        <h3>같은 상품 더보기</h3>
        <div className={styles.same_items_wrapper}>
          {displaySame.map((same) => {
            const imageUrl = getImageUrl(same.productThumb || same.thumb);
            return (
              <Link
                key={same.marketNo}
                to={`/store/${same.marketNo}`}
                className={storeStyles.cardLink}
              >
                <article className={`${storeStyles.card} ${styles.same_item}`}>
                  <div className={storeStyles.image}>
                    <img
                      src={
                        getImageUrl(same.productThumb || same.thumb) ||
                        "/no-image.svg"
                      }
                      alt={same.marketTitle || "상품 이미지"}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/no-image.svg";
                      }}
                    />
                  </div>
                  <h3>{same.marketTitle}</h3>
                  <p className={storeStyles.price}>
                    {formatPrice(same.productPrice)}
                  </p>
                  <div className={storeStyles.region_badge}>
                    {same.regionName || same.ctpvsggId || "지역 미등록"}
                  </div>
                  <p className={storeStyles.tradeType}>
                    거래방법 : {getTradeTypeLabel(same.tradeType)}
                  </p>
                  <div className={storeStyles.metaRow}>
                    <span className={storeStyles.author}>
                      {getDisplayName(same)}
                    </span>
                    <span className={storeStyles.metaDivider}>|</span>
                    <span className={storeStyles.commentCount}>
                      💬 {same.commentCount ?? 0}
                    </span>
                    <span className={storeStyles.metaDivider}>|</span>
                    <span className={storeStyles.dateLine}>
                      {same.createdAt ? formatCommentDate(same.createdAt) : ""}
                    </span>
                  </div>
                  <p className={storeStyles.viewCount}>
                    👀 조회수{" "}
                    {Number(same.readCount ?? 0).toLocaleString("ko-KR")}
                  </p>
                </article>
              </Link>
            );
          })}
        </div>
      </div>

      <div className={styles.comment_section}>
        <h3>댓글</h3>
        <div className={styles.comment_list}>
          {comments.length === 0 && <p>등록된 댓글이 없습니다.</p>}
          {comments.map((comment) => {
            // 비공개 댓글 접근 권한 처리
            // 댓글 작성자, 판매글 작성자, 또는 부모 댓글 작성자만 볼 수 있도록 합니다.
            const isOwn = comment.memberId && memberId === comment.memberId;
            const isBoardAuthor = memberId && item?.memberId === memberId;
            const parentAuthorId = comment.parentCommentNo
              ? comments.find((c) => c.reviewNo === comment.parentCommentNo)
                  ?.memberId
              : null;
            const isSecret = isSecretComment(comment);
            const canViewSecret =
              !isSecret ||
              isOwn ||
              isBoardAuthor ||
              parentAuthorId === memberId;
            const displayContent =
              isSecret && !canViewSecret
                ? "비공개 댓글입니다."
                : comment.reviewContent;
            const commentAvatarUrl =
              getMemberImageUrl(
                comment.memberThumb ||
                  (comment.memberId === memberId ? memberThumb : null),
              ) || userImg;
            return (
              <div
                key={comment.reviewNo}
                className={styles.comment_item}
                style={{ marginLeft: `${(comment.commentDepth || 0) * 20}px` }}
              >
                <p className={styles.comment_meta}>
                  <span className={styles.commentAuthorRow}>
                    <img
                      className={styles.commentAvatar}
                      src={commentAvatarUrl}
                      loading="lazy"
                      decoding="async"
                      alt={`${getDisplayName(comment)} 프로필`}
                      onError={(e) => {
                        e.currentTarget.src = userImg;
                      }}
                    />
                    <span>
                      {getDisplayName(comment)} ·{" "}
                      {formatCommentDate(comment.createdAt)}
                      {isSecret && (
                        <span className={styles.reply_badge}>비공개</span>
                      )}
                      {isCommentEdited(comment) && (
                        <span className={styles.comment_update_info}>
                          수정됨 · {formatCommentDateTime(comment.updatedAt)}
                        </span>
                      )}
                    </span>
                  </span>
                  {!isOwn && (
                    <button
                      type="button"
                      className={`${styles.report_icon_button} ${reportedCommentIds[comment.reviewNo] ? styles.reported : ""}`}
                      onClick={() => handleReportComment(comment.reviewNo)}
                      title={
                        reportedCommentIds[comment.reviewNo]
                          ? "신고 완료"
                          : "댓글 신고"
                      }
                    >
                      <span className="material-icons">
                        {reportedCommentIds[comment.reviewNo]
                          ? "report"
                          : "report_gmailerrorred"}
                      </span>
                    </button>
                  )}
                </p>

                {editingTarget &&
                editingTarget.reviewNo === comment.reviewNo ? (
                  <div className={styles.comment_edit_wrap}>
                    <input
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className={styles.comment_input}
                    />
                    <label className={styles.private_check}>
                      <input
                        type="checkbox"
                        checked={editingPrivate}
                        onChange={(e) => setEditingPrivate(e.target.checked)}
                      />
                      비공개
                    </label>
                    <button type="button" onClick={saveEditComment}>
                      저장
                    </button>
                    <button type="button" onClick={cancelEdit}>
                      취소
                    </button>
                  </div>
                ) : (
                  <p className={styles.comment_text}>{displayContent}</p>
                )}

                <div className={styles.comment_actions}>
                  <button
                    type="button"
                    onClick={() => startReplyToComment(comment)}
                  >
                    답글
                  </button>
                  {isOwn && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditComment(comment)}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment)}
                      >
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.comment_form}>
          <div className={styles.comment_form_meta}>
            <img
              className={styles.commentFormAvatar}
              src={getMemberImageUrl(memberThumb) || userImg}
              alt="내 프로필"
              onError={(e) => {
                e.currentTarget.src = userImg;
              }}
            />
            <span>
              {memberNickname || memberId || "비회원"} | 절약점수 : 00
            </span>
          </div>
          {replyTarget && (
            <div className={styles.reply_form}>
              답글 대상: {getDisplayName(replyTarget)}
              <button type="button" onClick={cancelReply}>
                취소
              </button>
            </div>
          )}
          <div className={styles.comment_form_row}>
            <input
              className={styles.comment_input}
              placeholder="댓글을 입력하세요..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />

            <label className={styles.private_check}>
              <input
                type="checkbox"
                checked={newCommentPrivate}
                onChange={(e) => setNewCommentPrivate(e.target.checked)}
              />
              비공개
            </label>

            <button type="button" onClick={handleAddComment}>
              {replyTarget ? "답글 등록" : "등록"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoreDetail;
