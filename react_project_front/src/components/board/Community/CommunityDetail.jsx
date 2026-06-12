import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../../store/useAuthStore";
import { normalizeImageUrl } from "../../../utils/getImageUrl";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import FlagIcon from "@mui/icons-material/Flag";
import styles from "./Community.module.css";
import userImg from "../../../assets/user.png";
import Swal from "sweetalert2";

const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

const formatTime = (rawDate) => {
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

const formatDate = (rawDate) => {
  if (!rawDate) return "";
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return rawDate;
  return date.toLocaleDateString("ko-KR");
};

const formatDateTime = (rawDate) => {
  if (!rawDate) return "";
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return rawDate;
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const getImageUrl = normalizeImageUrl;

const getMemberImageUrl = (thumb) => normalizeImageUrl(thumb, "member/thumb");

const hasImageInContent = (html) => {
  if (!html) return false;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.querySelector("img") !== null;
};

const CommunityDetail = ({
  board,
  onEdit,
  onDelete,
  onLikeChange,
  onCommentCountChange,
}) => {
  const safeBoard = board || {};
  const { memberId, memberNickname } = useAuthStore();
  const [comments, setComments] = useState([]);
  // 상세페이지에서 보여줄 댓글 개수를 별도 상태로 관리함.
  // board.commentCount가 있으면 초기값으로 사용하지만, 실제 로드된 댓글 개수로 동기화함.
  const [commentCount, setCommentCount] = useState(safeBoard.commentCount ?? 0);
  const [newComment, setNewComment] = useState("");
  const [newPrivate, setNewPrivate] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editText, setEditText] = useState("");
  const [editPrivate, setEditPrivate] = useState(false);

  const getDisplayName = (user) => {
    const name = user?.memberNickname?.trim();
    return name &&
      name.toLowerCase() !== "null" &&
      name.toLowerCase() !== "undefined"
      ? name
      : user?.memberId;
  };
  const [reportedCommentIds, setReportedCommentIds] = useState([]);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(safeBoard.likeCount ?? 0);
  const [scrapped, setScrapped] = useState(false);
  const commentsEndRef = useRef(null);
  const navigate = useNavigate();

  if (!board?.boardNo) {
    return null;
  }

  useEffect(() => {
    setComments([]);
    setNewComment("");
    setNewPrivate(false);
    setReplyTarget(null);
    setEditTarget(null);
    setEditText("");
    setEditPrivate(false);
    setLikeCount(board.likeCount ?? 0);
    setScrapped(false);

    if (memberId && board?.boardNo) {
      axios
        .get(
          `${import.meta.env.VITE_BACKSERVER}/boards/${board.boardNo}/likes/${memberId}`,
        )
        .then((res) => {
          const likedStatus = res.data === true;
          setLiked(likedStatus);
          onLikeChange?.(board.boardNo, likeCount, likedStatus);
        })
        .catch((err) => console.error("좋아요 여부 조회 실패", err));

      axios
        .get(
          `${import.meta.env.VITE_BACKSERVER}/boards/${board.boardNo}/tips/${memberId}`,
        )
        .then((res) => {
          // 서버에서 이 사용자가 현재 게시글을 스크랩했는지 여부를 받아옵니다.
          // 새로고침해도 현재 상태가 유지되도록 하기 위함입니다.
          setScrapped(res.data === true);
        })
        .catch((err) => console.error("스크랩 여부 조회 실패", err));
    } else {
      if (memberId && !board?.boardNo) {
        console.warn(
          "boardNo is undefined, skipping like/tip status fetch.",
          board,
        );
      }
      setLiked(false);
    }
  }, [board.boardNo, board.likeCount, memberId]);

  useEffect(() => {
    if (!board?.boardNo) {
      setComments([]);
      return;
    }

    axios
      .get(`${BACKSERVER}/boards/${board.boardNo}/comments`)
      .then((res) => {
        const loaded = Array.isArray(res.data) ? res.data : [];
        console.log(
          "[댓글 목록] boardNo=",
          board.boardNo,
          loaded.map((item) => ({
            memberId: item.memberId,
            memberThumb: item.memberThumb,
          })),
        );
        console.log(res.data);
        setComments(
          loaded.map((item) => ({
            ...item,
            id: item.commentNo,
            parentId: item.parentCommentNo,
            depth: item.commentDepth,
            isPrivate:
              item.isSecret === 1 ||
              item.isSecret === "1" ||
              item.isSecret === true,
            content: item.content,
            memberNickname: item.memberNickname || item.memberId,
          })),
        );
        // 서버에서 실제 댓글 목록을 받아오면 댓글 수를 동기화하고,
        // 리스트 상단에 표시되는 댓글 수가 새로고침 후에도 정확히 보이도록 함.
        setCommentCount(loaded.length);
        onCommentCountChange?.(board.boardNo, loaded.length);
      })
      .catch((err) => console.error("댓글 목록 조회 실패", err));
  }, [board.boardNo]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [comments]);

  // 상세 페이지 댓글 등록 기능임. 작성한 댓글을 서버로 보내고 댓글 목록에 추가함.
  //  - 일반 댓글과 대댓글을 모두 처리함.
  //  - 비공개 댓글 설정(isSecret)을 같이 서버로 보냄.
  const handleAddComment = async () => {
    if (!memberId) {
      Swal.fire({ icon: "warning", title: "로그인 후 댓글 작성 가능합니다." });
      return;
    }

    const text = newComment.trim();
    if (!text) {
      Swal.fire({ icon: "warning", title: "댓글을 입력해주세요" });
      return;
    }

    try {
      const payload = {
        memberId,
        memberNickname: memberNickname || memberId,
        content: text,
        isSecret: newPrivate ? 1 : 0,
        parentCommentNo: replyTarget?.commentNo ?? replyTarget?.id ?? null,
      };

      const res = await axios.post(
        `${BACKSERVER}/boards/${board.boardNo}/comments`,
        payload,
      );
      const saved = res.data;
      const addedComment = {
        ...saved,
        id: saved.commentNo,
        parentId: saved.parentCommentNo,
        depth: saved.commentDepth,
        isPrivate:
          saved.isSecret === 1 ||
          saved.isSecret === "1" ||
          saved.isSecret === true,
        content: saved.content,
      };

      // 댓글 등록 성공 시 댓글 리스트에 추가하고 카운트를 즉시 증가시킴.
      // 상세 페이지에서 변경된 댓글 수는 목록으로 전달하여 제목 영역에도 반영함.
      setComments((prev) => [...prev, addedComment]);
      const nextCount = commentCount + 1;
      setCommentCount(nextCount);
      onCommentCountChange?.(board.boardNo, nextCount);
      setNewComment("");
      setNewPrivate(false);
      setReplyTarget(null);
    } catch (err) {
      console.error("댓글 등록 실패", err);
      Swal.fire({
        icon: "error",
        title: "댓글 등록 실패",
        text: "댓글 등록 중 오류가 발생했습니다.",
      });
    }
  };

  const toggleLike = async () => {
    if (!memberId) {
      Swal.fire({ icon: "warning", title: "로그인이 필요합니다." });
      return;
    }

    try {
      if (!liked) {
        await axios.post(
          `${import.meta.env.VITE_BACKSERVER}/boards/${board.boardNo}/likes`,
          null,
          { params: { memberId } },
        );
        const nextCount = (likeCount ?? 0) + 1;
        setLiked(true);
        setLikeCount(nextCount);
        // 좋아요가 추가된 경우 목록에서도 즉시 반영하도록 상위 컴포넌트에 변경을 전달함.
        onLikeChange?.(board.boardNo, nextCount, true);
      } else {
        await axios.delete(
          `${import.meta.env.VITE_BACKSERVER}/boards/${board.boardNo}/likes`,
          { params: { memberId } },
        );
        const nextCount = (likeCount ?? 0) - 1;
        setLiked(false);
        setLikeCount(nextCount);
        // 좋아요 취소 후에도 목록 위치에서 상태가 일치하도록 변경을 전달함.
        onLikeChange?.(board.boardNo, nextCount, false);
      }
    } catch (err) {
      console.error("좋아요 처리 실패", err);
      Swal.fire({
        icon: "error",
        title: "좋아요 처리 실패",
        text: "다시 시도해주세요.",
      });
    }
  };

  const toggleScrap = async () => {
    if (!memberId) {
      Swal.fire({ icon: "warning", title: "로그인이 필요합니다." });
      return;
    }

    try {
      if (!scrapped) {
        // 사용자가 스크랩하지 않은 상태이면 서버에 스크랩 추가 요청을 보냅니다.
        // 스크랩을 등록하면 버튼 UI는 활성화 상태로 바뀝니다.
        await axios.post(`${BACKSERVER}/boards/${board.boardNo}/tips`, null, {
          params: { memberId },
        });
        setScrapped(true);
        Swal.fire({
          icon: "success",
          title: "스크랩 되었습니다.",
          timer: 1000,
          showConfirmButton: false,
        });
      } else {
        // 이미 스크랩 상태이면 서버에 스크랩 취소 요청을 보냅니다.
        // 취소 성공 시 버튼 UI도 비활성화 상태로 갱신됩니다.
        await axios.delete(`${BACKSERVER}/boards/${board.boardNo}/tips`, {
          params: { memberId },
        });
        setScrapped(false);
        Swal.fire({
          icon: "success",
          title: "스크랩이 취소되었습니다.",
          timer: 1000,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error("스크랩 처리 실패", err);
      Swal.fire({
        icon: "error",
        title: "스크랩 처리 실패",
        text: "다시 시도해주세요.",
      });
    }
  };

  const handleReport = async () => {
    const { value: category } = await Swal.fire({
      icon: "warning",
      title: "신고하기",
      input: "select",
      inputOptions: {
        "부적절한 게시글": "부적절한 게시글",
        "스팸/광고": "스팸/광고",
        "욕설/비방": "욕설/비방",
        허위정보: "허위정보",
        기타: "기타",
      },
      inputPlaceholder: "신고 사유를 선택해주세요",
      showCancelButton: true,
      confirmButtonText: "다음",
      cancelButtonText: "취소",
      confirmButtonColor: "#c0392b",
    });

    if (category) {
      const { value: content } = await Swal.fire({
        title: "신고 상세 내용",
        input: "textarea",
        inputPlaceholder: "신고 사유를 상세하게 작성해주세요",
        showCancelButton: true,
        confirmButtonText: "신고 접수",
        cancelButtonText: "취소",
        confirmButtonColor: "#c0392b",
      });

      if (content) {
        axios
          .post(`${import.meta.env.VITE_BACKSERVER}/boards/board-report`, {
            targetNo: board.boardNo,
            targetType: "board",
            memberId: memberId,
            reportCategory: category,
            reportContent: content,
          })
          .then((res) => {
            if (res.data === 1) {
              Swal.fire({ icon: "success", title: "신고 접수되었습니다." });
            } else if (res.data === -1) {
              Swal.fire({
                icon: "warning",
                title: "이미 신고한 게시글입니다.",
              });
            }
          })
          .catch((err) => {
            console.log(err);
            Swal.fire({
              icon: "error",
              title: "신고 실패",
              text: "잠시 후 다시 시도해주세요.",
            });
          });
      }
    }
  };

  const handleReportComment = async (commentId) => {
    const { value: category } = await Swal.fire({
      icon: "warning",
      title: "댓글 신고",
      input: "select",
      inputOptions: {
        "부적절한 댓글": "부적절한 댓글",
        "스팸/광고": "스팸/광고",
        "욕설/비방": "욕설/비방",
        허위정보: "허위정보",
        기타: "기타",
      },
      inputPlaceholder: "신고 사유를 선택해주세요",
      showCancelButton: true,
      confirmButtonText: "다음",
      cancelButtonText: "취소",
      confirmButtonColor: "#c0392b",
    });

    if (category) {
      const { value: content } = await Swal.fire({
        title: "신고 상세 내용",
        input: "textarea",
        inputPlaceholder: "신고 사유를 상세하게 작성해주세요",
        showCancelButton: true,
        confirmButtonText: "신고 접수",
        cancelButtonText: "취소",
        confirmButtonColor: "#c0392b",
      });

      if (content) {
        axios
          .post(`${import.meta.env.VITE_BACKSERVER}/boards/comment-report`, {
            targetNo: commentId,
            targetType: "comment",
            memberId: memberId,
            reportCategory: category,
            reportContent: content,
          })
          .then((res) => {
            if (res.data === 1) {
              Swal.fire({ icon: "success", title: "신고 접수되었습니다." });
            } else if (res.data === -1) {
              Swal.fire({ icon: "warning", title: "이미 신고한 댓글입니다." });
            }
          })
          .catch((err) => {
            console.log(err);
            Swal.fire({
              icon: "error",
              title: "신고 실패",
              text: "잠시 후 다시 시도해주세요.",
            });
          });
      }
    }
  };

  const handleStartReply = (comment) => {
    setReplyTarget(comment);
    setNewComment(`@${getDisplayName(comment)} `);
    setNewPrivate(false);
  };

  const handleCancelReply = () => {
    setReplyTarget(null);
    setNewComment("");
    setNewPrivate(false);
  };

  const handleStartEdit = (comment) => {
    if (memberId !== comment.memberId) return;
    setEditTarget(comment);
    setEditText(comment.content);
    setEditPrivate(comment.isPrivate === 1);
  };

  // 댓글 수정 처리
  // 이전에는 수정 버튼 클릭 시 바로 내용을 저장하는 흐름만 있었을 수 있음.
  // 지금은 수정 내용을 서버에 업데이트하고, 로컬 댓글 목록도 즉시 반영함.
  const handleSaveEdit = async () => {
    if (!editTarget) return;
    const text = editText.trim();
    if (!text) return;

    try {
      await axios.put(
        `${BACKSERVER}/boards/${board.boardNo}/comments/${editTarget.id}`,
        {
          memberId,
          content: text,
          isSecret: editPrivate ? 1 : 0,
        },
      );

      setComments((prev) =>
        prev.map((item) =>
          item.id === editTarget.id
            ? {
                ...item,
                content: text,
                isPrivate: editPrivate ? 1 : 0,
                updatedAt: new Date().toISOString(),
                edited: true,
              }
            : item,
        ),
      );
      setEditTarget(null);
      setEditText("");
      setEditPrivate(false);
    } catch (err) {
      console.error("댓글 수정 실패", err);
      Swal.fire({
        icon: "error",
        title: "댓글 수정 실패",
        text: "댓글 수정 중 오류가 발생했습니다.",
      });
    }
  };

  // 댓글 삭제 처리
  // 이전에는 삭제가 바로 실행되거나 버튼 순서가 뒤집혔을 수 있음.
  // 확인창을 띄워 사용자에게 삭제 의사를 다시 묻고, 순서를 "삭제 / 취소"로 고정함.
  const handleDeleteComment = async (comment) => {
    if (memberId !== comment.memberId) return;

    const result = await Swal.fire({
      icon: "warning",
      title: "댓글을 삭제하시겠습니까?",
      text: "삭제된 댓글은 복구할 수 없습니다.",
      showCancelButton: true,
      confirmButtonText: "삭제",
      cancelButtonText: "취소",
      confirmButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(
        `${BACKSERVER}/boards/${board.boardNo}/comments/${comment.id}`,
        {
          params: { memberId },
        },
      );
      // 댓글 삭제 성공 시 화면에서 해당 댓글을 제거하고 카운트를 감소시킵니다.
      setComments((prev) => prev.filter((item) => item.id !== comment.id));
      const nextCount = Math.max(0, commentCount - 1);
      setCommentCount(nextCount);
      onCommentCountChange?.(board.boardNo, nextCount);
      Swal.fire({ icon: "success", title: "댓글이 삭제되었습니다." });
    } catch (err) {
      console.error("댓글 삭제 실패", err);
      Swal.fire({
        icon: "error",
        title: "댓글 삭제 실패",
        text: "댓글 삭제 중 오류가 발생했습니다.",
      });
    }
  };

  // 비공개 댓글 보기 권한 판별을 위해 댓글을 ID 맵으로 보관함.
  // 이 맵은 대댓글이 비공개일 때 부모 댓글 작성자를 확인하는 용도로 사용됨.
  const commentMap = useMemo(() => {
    const map = {};
    comments.forEach((comment) => {
      map[comment.id] = comment;
    });
    return map;
  }, [comments]);

  const commentTree = useMemo(() => {
    const root = [];
    const map = {};

    comments.forEach((comment) => {
      map[comment.id] = { ...comment, replies: [] };
    });

    comments.forEach((comment) => {
      if (comment.parentId && map[comment.parentId]) {
        map[comment.parentId].replies.push(map[comment.id]);
      } else {
        root.push(map[comment.id]);
      }
    });

    return root;
  }, [comments]);

  const isSecretComment = (comment) =>
    comment.isPrivate === 1 ||
    comment.isPrivate === true ||
    comment.isPrivate === "1";

  // 비공개 댓글 접근 권한 조건
  // 댓글 작성자, 게시글 작성자, 해당 비공개 댓글의 부모 댓글 작성자만 내용을 볼 수 있습니다.
  const canViewSecretComment = (comment) => {
    if (!isSecretComment(comment)) return true;
    const isOwn = comment.memberId === memberId;
    const isBoardAuthor = memberId && board.writerId === memberId;
    const parentAuthorId = comment.parentId
      ? commentMap[comment.parentId]?.memberId
      : null;
    return Boolean(isOwn || isBoardAuthor || parentAuthorId === memberId);
  };

  const renderComments = (items) =>
    items.map((comment, index) => {
      const isOwn = comment.memberId === memberId;
      const isSecret = isSecretComment(comment);
      const displayText =
        comment.boardCommentStatus === 1
          ? "운영 정책에 따라 블라인드 처리된 댓글입니다."
          : isSecret && !canViewSecretComment(comment)
            ? "비공개 댓글입니다."
            : comment.content;
      // 댓글 작성자 아바타 URL 처리임.
      // 댓글 작성자의 memberThumb가 있으면 적용하고, 없으면 기본 이미지로 보여줌.
      const commentAvatarUrl =
        getMemberImageUrl(
          comment.memberThumb ||
            comment.commentThumb ||
            comment.thumb ||
            comment.profileThumb,
        ) || userImg;
      return (
        <div
          key={
            comment.commentNo ??
            comment.id ??
            `${comment.memberId}-${comment.createdAt}-${index}`
          }
          className={styles.commentItem}
          style={{ marginLeft: `${comment.depth * 18}px` }}
        >
          <div className={styles.commentMeta}>
            <div className={styles.commentMetaLeft}>
              <img
                src={commentAvatarUrl}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = userImg;
                }}
                alt="댓글 작성자"
                className={styles.commentAvatar}
              />
              <span>{getDisplayName(comment)}</span>
              <span>{formatTime(comment.createdAt)}</span>
              {(comment.updatedAt || comment.updateAt) &&
                (comment.updatedAt || comment.updateAt) !==
                  comment.createdAt && (
                  <span className={styles.commentUpdateMeta}>
                    수정됨 ·{" "}
                    {formatDateTime(comment.updatedAt || comment.updateAt)}
                  </span>
                )}
              {isSecret && <span className={styles.commentBadge}>비공개</span>}
            </div>
            <button
              type="button"
              className={`${styles.reportIconButton} ${reportedCommentIds.includes(comment.id) ? styles.reported : ""}`}
              onClick={() => handleReportComment(comment.id)}
              title="댓글 신고"
            >
              <span className="material-icons">
                {reportedCommentIds.includes(comment.id)
                  ? "report"
                  : "report_gmailerrorred"}
              </span>
            </button>
          </div>
          {editTarget && editTarget.id === comment.id ? (
            <div className={styles.commentEditBox}>
              <input
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className={styles.commentInput}
              />
              <label className={styles.privateCheck}>
                <input
                  type="checkbox"
                  checked={editPrivate}
                  onChange={(e) => setEditPrivate(e.target.checked)}
                />
                비공개
              </label>
              <button type="button" onClick={handleSaveEdit}>
                저장
              </button>
              <button type="button" onClick={() => setEditTarget(null)}>
                취소
              </button>
            </div>
          ) : (
            <p
              className={
                comment.boardCommentStatus === 1
                  ? styles.commentBlinded
                  : styles.commentText
              }
            >
              {displayText}
            </p>
          )}
          <div className={styles.commentActions}>
            <button
              type="button"
              className={styles.commentActionBtn}
              onClick={() => handleStartReply(comment)}
            >
              답글
            </button>
            {isOwn && (
              <button
                type="button"
                className={styles.commentActionBtn}
                onClick={() => handleStartEdit(comment)}
              >
                수정
              </button>
            )}
            {isOwn && (
              <button
                type="button"
                className={styles.commentActionBtn}
                onClick={() => handleDeleteComment(comment)}
              >
                삭제
              </button>
            )}
          </div>
          {comment.replies.length > 0 && renderComments(comment.replies)}
        </div>
      );
    });

  return (
    <div
      className={styles.boardDetailContainer}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.detailTopArea}>
        <div>
          <div className={styles.detailTitle}>{board.boardTitle}</div>
          <div className={styles.detailMeta}>
            {/* 상세 페이지 작성자 아바타 처리임.
                작성자 썸네일 값을 우선 사용하고 없으면 기본 이미지로 대체함. */}
            <img
              src={
                getMemberImageUrl(
                  board.writerThumb ||
                    board.memberThumb ||
                    board.profileThumb ||
                    board.thumb,
                ) || userImg
              }
              onError={(e) => {
                const target = e.currentTarget;
                target.onerror = null;
                target.src = userImg;
              }}
              alt="작성자"
              className={styles.detailMetaAvatar}
            />
            <span>{board.writerNickname || board.writerId}</span>
            <span>·</span>
            <span>{formatTime(board.createDate)}</span>
          </div>
          {(board.updatedAt || board.updateAt) &&
            (board.updatedAt || board.updateAt) !== board.createDate && (
              // 상세 페이지에서는 게시글 수정 여부와 수정 날짜를 보여줌.
              <div className={styles.detailUpdateMeta}>
                수정됨 · {formatDateTime(board.updatedAt || board.updateAt)}
              </div>
            )}
        </div>
        <div className={styles.detailButtonsTop}>
          <button
            type="button"
            className={`${styles.smallButton} ${liked ? styles.activeButton : ""}`}
            onClick={toggleLike}
          >
            {liked ? (
              <FavoriteIcon fontSize="small" />
            ) : (
              <FavoriteBorderIcon fontSize="small" />
            )}{" "}
            좋아요 {likeCount}
          </button>
          <button
            type="button"
            className={`${styles.smallButton} ${scrapped ? styles.activeButton : ""}`}
            onClick={toggleScrap}
          >
            {scrapped ? (
              <BookmarkIcon fontSize="small" />
            ) : (
              <BookmarkBorderIcon fontSize="small" />
            )}{" "}
            스크랩
          </button>
          <button
            type="button"
            className={`${styles.smallButton} ${styles.reportButton}`}
            onClick={handleReport}
          >
            <FlagIcon fontSize="small" /> 신고
          </button>
        </div>
      </div>

      <div className={styles.detailInfoPanel}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>조회수</span>
          <span className={styles.statValue}>{board.readCount ?? 0}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>좋아요</span>
          <span className={styles.statValue}>{likeCount}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>댓글</span>
          <span className={styles.statValue}>{commentCount}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>작성자</span>
          <span className={styles.statValue}>
            {board.writerNickname || board.writerId}
          </span>
        </div>
      </div>

      <div className={styles.detailSectionHeader}>게시물 내용</div>
      <div className={styles.detailContentBox}>
        <div
          className={styles.detailContent}
          dangerouslySetInnerHTML={{
            __html: board.boardContent || "<p>내용 없음</p>",
          }}
        />
        {!hasImageInContent(board.boardContent) && board.boardThumb && (
          <div className={styles.detailImageWrap}>
            {/* board.boardThumb가 파일명으로 와도 /upload/로 바꿔서 보여줘요. */}
            <img
              src={getImageUrl(board.boardThumb)}
              alt="게시글 이미지"
              className={styles.detailImage}
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
      </div>

      <div className={styles.detailActionsRow}>
        {memberId === board.writerId && (
          <>
            <button
              type="button"
              className={styles.detailActionBtn}
              onClick={() => onEdit(board)}
            >
              수정
            </button>
            <button
              type="button"
              className={styles.detailActionBtn}
              onClick={() => onDelete(board.boardNo)}
            >
              삭제
            </button>
          </>
        )}
      </div>

      <div className={styles.commentSection}>
        <h4>댓글</h4>
        <div className={styles.commentWrapper}>
          {comments.length === 0 && (
            <p className={styles.commentEmpty}>등록된 댓글이 없습니다.</p>
          )}
          {renderComments(commentTree)}
        </div>

        <div className={styles.commentForm}>
          {replyTarget && (
            <div className={styles.replyNote}>
              답글 대상: {getDisplayName(replyTarget)}
              <button type="button" onClick={handleCancelReply}>
                취소
              </button>
            </div>
          )}
          <div className={styles.commentFormRow}>
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className={styles.commentInput}
            />
            <label className={styles.privateCheck}>
              <input
                type="checkbox"
                checked={newPrivate}
                onChange={(e) => setNewPrivate(e.target.checked)}
              />
              비공개
            </label>
            <button
              type="button"
              onClick={handleAddComment}
              className={styles.detailActionBtn}
            >
              등록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityDetail;
