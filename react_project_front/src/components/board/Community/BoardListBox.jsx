import axios from "axios";
import { useEffect, useRef } from "react";
import CommunityDetail from "./CommunityDetail";
import styles from "./Community.module.css";
import userImg from "../../../assets/user.png";
import useAuthStore from "../../../store/useAuthStore";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ChatIcon from "@mui/icons-material/Chat";
import VisibilityIcon from "@mui/icons-material/Visibility";

const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

const getDisplayName = (user) => {
  const name = user?.writerNickname || user?.memberNickname;
  if (
    !name ||
    ["null", "undefined"].includes(String(name).trim().toLowerCase())
  ) {
    return user?.writerId || user?.memberId || "";
  }
  return name;
};

const BoardListBox = ({
  boardList,
  expandedBoardNo,
  setExpandedBoardNo,
  selectedBoard,
  setSelectedBoard,
  setBoardList,
  startEdit,
  deleteBoard,
  getImageUrl,
  getAvatarUrl,
  detailLoading,
}) => {
  const itemRefs = useRef({});
  const { memberId, memberThumb } = useAuthStore();

  const getBoardNo = (board) =>
    board?.boardNo ?? board?.boardId ?? board?.id ?? null;

  const normalizeId = (id) =>
    id !== null && id !== undefined ? String(id) : "";

  useEffect(() => {
    if (!expandedBoardNo) return;
    const item = itemRefs.current[normalizeId(expandedBoardNo)];
    if (!item) return;
    window.requestAnimationFrame(() => {
      item.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [expandedBoardNo]);

  const handleBoardClick = async (board) => {
    const boardNo = getBoardNo(board);
    if (!boardNo) {
      console.warn("boardNo is undefined, skipping read count update.", board);
      return;
    }

    const isExpanded = normalizeId(expandedBoardNo) === normalizeId(boardNo);
    if (!isExpanded) {
      try {
        // 게시글 목록에서 게시글을 처음 클릭했을 때 조회수를 올리는 요청을 보냄.
        // 이미 펼쳐진 게시글을 다시 클릭하면 조회수를 다시 올리지 않도록 함.
        await axios.get(`${BACKSERVER}/boards/${boardNo}/read`);
        setBoardList((prev) =>
          prev.map((item) => {
            const itemBoardNo = getBoardNo(item);
            return normalizeId(itemBoardNo) === normalizeId(boardNo)
              ? { ...item, readCount: (item.readCount ?? 0) + 1 }
              : item;
          }),
        );
      } catch (err) {
        console.error("조회수 증가 실패", err);
      }
    }

    setExpandedBoardNo(isExpanded ? null : boardNo);
    setSelectedBoard(isExpanded ? null : board);
  };

  return (
    <div className={styles.boardListBox}>
      {boardList.length > 0 ? (
        <ul className={styles.boardListItems}>
          {boardList
            .filter((board) => getBoardNo(board) !== null)
            .map((board, index) => {
              const boardNo = getBoardNo(board);
              const isExpanded =
                normalizeId(expandedBoardNo) === normalizeId(boardNo);
              return (
                <li
                  ref={(el) => {
                    if (el) {
                      itemRefs.current[normalizeId(boardNo)] = el;
                    }
                  }}
                  className={styles.boardListItem}
                  key={boardNo}
                >
                  <div
                    className={styles.boardItem}
                    onClick={() => handleBoardClick(board)}
                  >
                    <div className={styles.boardItemTop}>
                      <div className={styles.boardWriter}>
                        {/* 작성자 프로필 이미지 렌더링임.
                          memberThumb 우선, 없으면 로그아웃된 본인일 경우 스토어의 memberThumb 사용,
                          그도 없으면 기본 user.png로 대체함. */}
                        <img
                          src={
                            getImageUrl(
                              board.thumbnailUrl || board.boardThumb,
                            ) || "/no-image.svg"
                          }
                          alt="썸네일"
                          className={styles.boardThumbnail}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/no-image.svg";
                          }}
                          className={styles.writerAvatar}
                        />
                        <span>{getDisplayName(board)}</span>
                      </div>
                      <div className={styles.boardDate}>
                        {board.createDate || board.boardDate}
                      </div>
                    </div>
                    <div className={styles.boardTitleWrap}>
                      <div className={styles.boardTitle}>
                        {board.boardTitle ||
                          board.BOARD_TITLE ||
                          board.title ||
                          "제목 없음"}
                      </div>
                      {(board.updatedAt || board.updateAt) &&
                        board.updatedAt !== board.createDate && (
                          // 게시글 생성일과 수정일이 다르면 수정된 글로 판단해서 배지를 보여줌.
                          <span className={styles.boardUpdatedBadge}>
                            수정됨
                          </span>
                        )}
                    </div>

                    {(board.thumbnailUrl || board.boardThumb) && (
                      <div className={styles.boardThumbnailBox}>
                        {/*
                          게시글 리스트 썸네일은 lazy loading으로 처리함.
                          대역폭을 아끼고 스크롤 성능을 개선함.
                        */}
                        <img
                          src={
                            getImageUrl(
                              board.thumbnailUrl || board.boardThumb,
                            ) || "/no-image.svg"
                          }
                          alt="썸네일"
                          className={styles.boardThumbnail}
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/no-image.svg";
                          }}
                          className={styles.boardThumbnail}
                        />
                      </div>
                    )}
                    <div className={styles.boardItemBottom}>
                      <span className={styles.iconItem}>
                        <VisibilityIcon fontSize="small" />
                        <span>{board.readCount ?? 0}</span>
                      </span>
                      <span className={styles.iconItem}>
                        {board.liked ? (
                          <FavoriteIcon fontSize="small" />
                        ) : (
                          <FavoriteBorderIcon fontSize="small" />
                        )}
                        <span>{board.likeCount ?? 0}</span>
                      </span>
                      <span className={styles.iconItem}>
                        <ChatIcon fontSize="small" />
                        <span>{board.commentCount ?? 0}</span>
                      </span>
                    </div>
                    {isExpanded && detailLoading ? (
                      <div className={styles.boardDetailLoading}>
                        상세 정보를 불러오는 중입니다...
                      </div>
                    ) : (
                      isExpanded && (
                        <CommunityDetail
                          board={
                            normalizeId(getBoardNo(selectedBoard)) ===
                            normalizeId(boardNo)
                              ? selectedBoard
                              : board
                          }
                          onEdit={(boardItem) => {
                            setSelectedBoard(boardItem);
                            startEdit(boardItem);
                          }}
                          onDelete={(boardNo) => deleteBoard(boardNo)}
                          onLikeChange={(boardNo, newLikeCount, liked) => {
                            setBoardList((prev) =>
                              prev.map((item) =>
                                item.boardNo === boardNo
                                  ? { ...item, likeCount: newLikeCount, liked }
                                  : item,
                              ),
                            );
                          }}
                          onCommentCountChange={(boardNo, newCommentCount) => {
                            setBoardList((prev) =>
                              prev.map((item) =>
                                item.boardNo === boardNo
                                  ? { ...item, commentCount: newCommentCount }
                                  : item,
                              ),
                            );
                          }}
                        />
                      )
                    )}
                  </div>
                </li>
              );
            })}
        </ul>
      ) : (
        <div className={styles.emptyBoard}>등록된 게시글이 없습니다.</div>
      )}
    </div>
  );
};

export default BoardListBox;
