import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import styles from "./CartPage.module.css";
import { normalizeImageUrl } from "../../utils/getImageUrl";

const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

const getImageUrl = normalizeImageUrl;

const formatPrice = (value) =>
  `${Number(value || 0).toLocaleString("ko-KR")}원`;

// 찜한 상품 페이지임.
//  - 사용자가 관심 있어 하는 상품을 모아두는 목록임.
//  - 상세 페이지로 이동하거나 원하는 항목을 삭제할 수 있음.
const CartPage = () => {
  const { memberId, isReady } = useAuthStore();
  const [cartItems, setCartItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadCart = async () => {
      if (!memberId) {
        setCartItems([]);
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const res = await axios.get(`${BACKSERVER}/api/store/cart`, {
          params: { memberId },
        });
        setCartItems(Array.isArray(res.data) ? res.data : []);
        setErrorMessage("");
      } catch (error) {
        console.error("장바구니 조회 실패", error);
        setErrorMessage("장바구니 정보를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [memberId]);

  const totalAmount = useMemo(
    () =>
      cartItems.reduce((sum, item) => sum + Number(item.productPrice || 0), 0),
    [cartItems],
  );

  const handleGoToDetail = (marketNo) => {
    if (!marketNo) return;
    navigate(`/store/${marketNo}`);
  };

  const handleRemove = async (cartNo) => {
    if (!cartNo) {
      alert("삭제할 상품 식별자가 없습니다. 새로고침 후 다시 시도해주세요.");
      return;
    }
    try {
      await axios.delete(`${BACKSERVER}/api/store/cart/${cartNo}`, {
        params: { memberId },
      });
      setCartItems((prev) => prev.filter((item) => item.cartNo !== cartNo));
    } catch (error) {
      console.error("장바구니 삭제 실패", error);
      alert("장바구니에서 상품을 삭제하지 못했습니다.");
    }
  };

  if (!memberId && isReady) {
    return (
      <div className={styles.cart_wrap}>
        <h2 className={styles.cart_title}>찜한 상품</h2>
        <p className={styles.cart_empty}>
          로그인 후 찜한 상품을 이용하실 수 있습니다.{" "}
          <Link className={styles.cart_link} to="/members/login">
            로그인
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={styles.cart_wrap}>
      <h2 className={styles.cart_title}>찜한 상품</h2>
      <p className={styles.cart_subtitle}>
        찜한 상품을 클릭하면 중고장터 상세페이지로 이동합니다.
      </p>
      {isLoading ? (
        <div className={styles.cart_empty}>로딩 중입니다...</div>
      ) : errorMessage ? (
        <div className={styles.cart_empty}>{errorMessage}</div>
      ) : cartItems.length === 0 ? (
        <div className={styles.cart_empty}>찜한 상품이 없습니다.</div>
      ) : (
        <>
          <div className={styles.cart_control_bar}>
            <div className={styles.cart_summary_text}>
              <span>전체 금액: {formatPrice(totalAmount)}</span>
            </div>
          </div>

          <div className={styles.cart_list}>
            {cartItems.map((item) => {
              const imageUrl = getImageUrl(item.productThumb);
              return (
                <div
                  key={item.cartNo ?? item.marketNo}
                  className={styles.cart_item}
                >
                  <Link
                    to={`/store/${item.marketNo}`}
                    className={styles.cart_link}
                  >
                    <div className={styles.cart_item_image_wrap}>
                      {imageUrl ? (
                        <img
                          className={styles.cart_item_image}
                          src={imageUrl}
                          alt={item.marketTitle || "상품 이미지"}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span>이미지 없음</span>
                      )}
                    </div>
                  </Link>
                  <div className={styles.cart_item_content}>
                    <Link
                      to={`/store/${item.marketNo}`}
                      className={styles.cart_link}
                    >
                      <h3 className={styles.cart_item_title}>
                        {item.marketTitle || "상품명 없음"}
                      </h3>
                    </Link>
                    {item.quantity > 1 && (
                      <p className={styles.cart_item_meta}>
                        수량: {item.quantity}
                      </p>
                    )}
                    <p className={styles.cart_item_price}>
                      {formatPrice(item.productPrice)}
                    </p>
                  </div>
                  <div className={styles.cart_item_actions}>
                    <button
                      type="button"
                      className={styles.cart_button}
                      onClick={() => handleGoToDetail(item.marketNo)}
                    >
                      바로가기
                    </button>
                    <button
                      type="button"
                      className={styles.cart_remove_button}
                      onClick={() => handleRemove(item.cartNo)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CartPage;
