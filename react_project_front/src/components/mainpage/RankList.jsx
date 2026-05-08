import { useEffect, useState } from "react";
import styles from "./RankList.module.css";
import axios from "axios";
import defaultImg from "../../assets/img/defaultImg.png";
import { normalizeImageUrl } from "../../utils/getImageUrl";

const RankList = () => {
  const [rankList, setRankList] = useState([]);
  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_BACKSERVER}/members/rank`)
      .then((res) => {
        console.log(res);
        setRankList(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return (
    <>
      <div className={styles.ranklist_wrap}>
        <div>총 절감 탄소배출량 랭킹</div>
        <ul className={styles.list_wrap}>
          {rankList.map((rank, i) => (
            <li key={`${rank}+${i}`} className={styles.list_item}>
              <div>
                <p>{i + 1}</p>
                <p>
                  <img
                    src={rank.memberThumb ? defaultImg : defaultImg}
                    className={styles.list_thumb}
                    loading="lazy"
                    decoding="async"
                  />
                </p>
                <p>{rank.memberNickname}</p>
              </div>
              <p>{rank.memberCo2.toFixed(0)} Kg</p>
            </li>
          ))}
        </ul>
        <p>여러분도 탄소줄이기 랭킹에 도전해보세요!</p>
      </div>
    </>
  );
};

export default RankList;
