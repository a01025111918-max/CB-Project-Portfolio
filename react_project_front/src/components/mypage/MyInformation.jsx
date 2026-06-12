import { useEffect, useRef, useState } from "react";
import styles from "./MyInformation.module.css";
import axios from "axios";

import userImg from "../../assets/admin.png";
import useAuthStore from "../../store/useAuthStore.js";
import { normalizeImageUrl } from "../../utils/getImageUrl";
import { compressImageFile } from "../../utils/compressImage";
const BACKSERVER =
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

// 서버에 저장된 썸네일 경로를 실제 이미지 URL로 변환함.
// - 절대 URL이면 그대로 사용함.
// - 상대 경로이거나 백엔드에서 내려온 경로면 백엔드 주소를 붙여서 변환함.
const getImageUrl = (thumb) => normalizeImageUrl(thumb, "member/thumb");

const MyInformation = () => {
  // 왼쪽 마이페이지 카드 컴포넌트임.
  // 회원 정보를 보여주고, 프로필 사진 변경 기능도 처리함.
  const { memberId, memberNickname, isReady, memberThumb, setThumb } =
    useAuthStore();

  // 서버에서 받아온 회원 정보 저장용 상태임.
  const [member, setMember] = useState();
  // 준비 완료 표시용 상태. 현재는 주로 테스트 용도임.
  const [readyMark, setReadyMark] = useState(false);
  // 게시글 조회수 합계를 표시하기 위한 상태임.
  const [viewCount, setViewCount] = useState(0);

  // 숨겨진 파일 업로드 input 요소를 클릭하기 위한 ref.
  const reference = useRef(null);

  // 컴포넌트가 처음 렌더될 때 서버에서 회원 정보와 조회수를 가져옴.
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKSERVER}/members/${memberId}`)
      .then((res) => {
        // 서버에서 받아온 회원 정보 저장함.
        setMember(res.data);
        // 회원 썸네일이 서버에 있고, 현재 상태에 없으면 업데이트함.
        if (res.data?.memberThumb && res.data.memberThumb !== memberThumb) {
          setThumb(res.data.memberThumb);
        }
      })
      .catch((err) => {
        console.log(memberId);
        console.log(err);
      });

    axios
      .get(
        `${import.meta.env.VITE_BACKSERVER}/boards/${memberId}?searchBoard=&filter=2&checker=1`,
      )
      .then((res) => {
        const boards = Array.isArray(res.data) ? res.data : [];
        const totalViews = boards.reduce(
          (sum, board) => sum + Number(board.readCount || 0),
          0,
        );
        // 조회수 합계를 상태로 저장함.
        setViewCount(totalViews);
      })
      .catch((err) => {
        console.log("조회수 로드 실패", err);
      });
  }, [memberId, memberThumb, setThumb]);

  // 프로필 사진 변경 함수임.
  // 파일을 선택하면 서버에 업로드하고, 업로드된 경로를 전역 상태에 저장함.
  const changeThumb = async () => {
    const thumbFile = reference.current.files && reference.current.files[0];
    if (!thumbFile) {
      return;
    }
    const compressedThumbFile = await compressImageFile(thumbFile, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.75,
    });
    const data = new FormData();
    data.append("file", compressedThumbFile, compressedThumbFile.name);
    axios
      .patch(
        `${import.meta.env.VITE_BACKSERVER}/members/${memberId}/thumb`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      )
      .then((res) => {
        useAuthStore.getState().setThumb(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    member &&
    memberId && (
      <div className={styles.myinformation_main_wrap}>
        {/* 프로필 사진 영역 */}
        <div className={styles.myinformation_img_outer}>
          <div className={styles.myinformation_img_wrap}>
            <img
              loading="lazy"
              decoding="async"
              src={
                member.memberThumb !== null
                  ? getImageUrl(
                      memberThumb === null ? member.memberThumb : memberThumb,
                    )
                  : userImg
              }
            />
          </div>
          <div
            className={styles.dag}
            onClick={() => {
              reference.current.click();
            }}
          >
            변경
          </div>
        </div>
        <input
          type="file"
          accept="image/*"
          ref={reference}
          style={{ display: "none" }}
          onChange={changeThumb}
        />

        {/* 기본 회원 정보 텍스트 목록 */}
        <div className={styles.myinformation_content_wrap}>
          <ul>
            <li>
              <span className={styles.item_label}>아이디</span>
              <span className={styles.item_value}>{memberId}</span>
            </li>
            <li>
              <span className={styles.item_label}>이름</span>
              <span className={styles.item_value}>{member.memberName}</span>
            </li>
            <li>
              <span className={styles.item_label}>닉네임</span>
              <span className={styles.item_value}>{memberNickname}</span>
            </li>
            <li className={styles.email_row}>
              <span className={styles.item_label}>이메일</span>
              <span className={styles.item_value}>{member.memberEmail}</span>
            </li>
            <li>
              <span className={styles.item_label}>조회수</span>
              <span className={styles.item_value}>
                {viewCount.toLocaleString()}
              </span>
            </li>
          </ul>
        </div>

        {/* 총 탄소 절약 값 표시 */}
        <div className={styles.myinformation_carbonfootprint_wrap}>
          <p>총 탄소 절약</p>
          <h3>
            {member.memberCo2 != null
              ? `${Number(member.memberCo2).toLocaleString()}kg`
              : "0kg"}
          </h3>
        </div>
      </div>
    )
  );
};
export default MyInformation;
