import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import useAuthStore from "../../../store/useAuthStore";
import styles from "./productRegistration.module.css";
import { normalizeImageUrl } from "../../../utils/getImageUrl";
import { compressImageFile } from "../../../utils/compressImage";

const BACKSERVER =
  import.meta.env.VITE_BACKSERVER ||
  "http://ec2-13-125-148-128.ap-northeast-2.compute.amazonaws.com:9999";

const ProductRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editItem = location.state?.editItem || null;
  const { memberId, memberNickname } = useAuthStore();

  const [title, setTitle] = useState("");
  const [tradeMethod, setTradeMethod] = useState("");
  const [productState, setProductState] = useState("");
  const [price, setPrice] = useState("");
  const [displayPrice, setDisplayPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageName, setImageName] = useState("");
  const [productThumb, setProductThumb] = useState("");
  const [regionLabel, setRegionLabel] = useState("");
  const [region, setRegion] = useState("");
  const [regions, setRegions] = useState([]);
  const [showRegionList, setShowRegionList] = useState(false);

  const handlePriceChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setPrice(raw);
    setDisplayPrice(raw ? Number(raw).toLocaleString("ko-KR") : "");
  };

  const descriptionPlaceholder = `- 상품명(브랜드)
- 구매 시기 (년, 월, 일)
- 사용 기간
- 하자 여부
* 실제 촬영한 사진과 함께 상세 정보를 입력해주세요.`;

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);

    // 상품 이미지도 업로드 전에 크기를 줄여서 서버 전송량을 줄임
    const compressedFile = await compressImageFile(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.75,
    });
    const formData = new FormData();
    formData.append("upfile", compressedFile, compressedFile.name);

    try {
      const response = await axios.post(
        `${BACKSERVER}/boards/editor/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      const uploadResult = response.data;
      const fileUrl =
        typeof uploadResult === "string"
          ? normalizeImageUrl(uploadResult, "board/editor")
          : normalizeImageUrl(
              uploadResult?.url ||
                uploadResult?.fileUrl ||
                uploadResult?.path ||
                "",
              "board/editor",
            );
      setProductThumb(fileUrl || "");
    } catch (error) {
      console.error("상품 이미지 업로드 실패", error);
      alert("상품 이미지 업로드에 실패했습니다.");
      setImageName("");
      setProductThumb("");
    }
  };

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
    return "";
  };

  const getImageUrl = normalizeImageUrl;

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const response = await axios.get(`${BACKSERVER}/api/regions`);
        setRegions(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("지역 목록 조회 실패", error);
        setRegions([]);
      }
    };

    fetchRegions();
  }, []);

  const normalizeStoredProductThumb = (thumb) => {
    // 편집 화면에서 editItem.productThumb를 화면에 표시하기 위한 전처리 함수.
    // 서버에 저장된 값이 다양한 형태로 올 수 있기 때문에, 공통 normalizeImageUrl로 처리합니다.
    const normalized = normalizeImageUrl(thumb, "board/editor");
    return normalized || "";
  };

  useEffect(() => {
    if (!editItem) return;
    setTitle(editItem.marketTitle || "");
    setTradeMethod(normalizeTradeType(editItem.tradeType) || "");
    setProductState(
      editItem.productStatus === "1"
        ? "예약중"
        : editItem.productStatus === "2"
          ? "판매완료"
          : "",
    );
    setPrice(editItem.productPrice ? String(editItem.productPrice) : "");
    setDisplayPrice(
      editItem.productPrice
        ? Number(editItem.productPrice).toLocaleString("ko-KR")
        : "",
    );
    setDescription(editItem.marketContent || "");
    setImageName(
      editItem.productThumb ? editItem.productThumb.split("/").pop() : "",
    );
    setProductThumb(normalizeStoredProductThumb(editItem.productThumb));
    setRegion(editItem.ctpvsggId || "");
    setRegionLabel(editItem.regionName || editItem.ctpvsggId || "");
  }, [editItem]);

  const regionOptions = useMemo(
    () =>
      regions.map((regionOption) => ({
        label:
          `${regionOption.ctpvNm || ""} ${regionOption.sggNm || ""}`.trim(),
        id: regionOption.ctpvsggId,
      })),
    [regions],
  );

  const regionMap = useMemo(
    () => new Map(regionOptions.map((item) => [item.label, item.id])),
    [regionOptions],
  );

  const filteredRegions = useMemo(() => {
    const query = regionLabel.trim().toLowerCase();
    if (!query) return regionOptions;
    return regionOptions.filter((regionOption) =>
      regionOption.label.toLowerCase().includes(query),
    );
  }, [regionLabel, regionOptions]);

  const handleRegionBlur = () => {
    setTimeout(() => setShowRegionList(false), 150);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!memberId) {
      alert("로그인 후 판매글을 등록할 수 있습니다.");
      navigate("/members/login");
      return;
    }

    let tradeType;
    if (tradeMethod === "직거래/택배") tradeType = "직거래/택배";
    else if (tradeMethod === "직거래") tradeType = "직거래";
    else if (tradeMethod === "택배") tradeType = "택배";
    else {
      alert("거래방법을 정확히 선택해주세요.");
      return;
    }

    const requiresRegion = tradeType !== "택배";
    if (
      !title ||
      !tradeMethod ||
      !productState ||
      !price ||
      (requiresRegion && !region)
    ) {
      alert(
        "필수 항목(제목, 거래방법, 상품상태, 가격, 거래지역)을 모두 입력해주세요.",
      );
      return;
    }

    let productStatus = "0";
    if (productState === "예약중") productStatus = "1";
    else if (productState === "판매완료") productStatus = "2";

    const payload = {
      marketTitle: title,
      marketContent: description,
      ctpvsggId: tradeType === "택배" ? null : region || null,
      productPrice: Number(price),
      productStatus,
      productThumb: productThumb || "",
      tradeType,
      memberId,
      memberNickname,
    };
    console.log("상품 등록 payload", payload);

    try {
      if (editItem) {
        await axios.put(`${BACKSERVER}/api/store/boards/${editItem.marketNo}`, {
          ...payload,
          marketNo: editItem.marketNo,
          boardNo: editItem.boardNo,
        });
        alert("수정이 완료되었습니다.");
        navigate(`/store/${editItem.marketNo}`);
      } else {
        await axios.post(`${BACKSERVER}/api/store/boards`, payload);
        alert("등록이 완료되었습니다.");
        navigate("/store");
      }
    } catch (error) {
      console.error("상품 등록 실패", error);
      const serverMessage =
        error?.response?.data ||
        error?.message ||
        "상품 등록 중 오류가 발생했습니다.";
      alert(`상품 등록 중 오류가 발생했습니다.\n${serverMessage}`);
    }
  };

  return (
    <section className={styles.register_wrap}>
      <h1>중고장터</h1>

      <form className={styles.register_form} onSubmit={handleSubmit}>
        <div className={styles.title_row}>
          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className={styles.content_grid}>
          <div className={styles.left_panel}>
            <div className={styles.image_box}>
              {(() => {
                const url = getImageUrl(productThumb);
                if (url) {
                  return (
                    <img
                      src={url}
                      alt={imageName || "상품 이미지"}
                      className={styles.uploaded_image}
                      loading="lazy"
                      decoding="async"
                    />
                  );
                }
                return imageName || "이미지";
              })()}
            </div>
            <div className={styles.left_actions}>
              <label className={styles.action_btn}>
                업로드
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  hidden
                />
              </label>
              <button
                type="button"
                className={styles.action_btn}
                onClick={() => {
                  setImageName("");
                  setProductThumb("");
                }}
              >
                {" "}
                수정하기
              </button>
            </div>
          </div>

          <div className={styles.right_panel}>
            <div className={styles.meta_row}>
              <div className={styles.meta_item}>
                <span className={styles.meta_label}>거래방법</span>
                <span className={styles.meta_divider}>:</span>
                <select
                  value={tradeMethod}
                  onChange={(e) => setTradeMethod(e.target.value)}
                >
                  <option value="" disabled>
                    선택
                  </option>
                  <option value="직거래/택배">직거래/택배</option>
                  <option value="직거래">직거래</option>
                  <option value="택배">택배</option>
                </select>
              </div>

              <div className={styles.meta_item}>
                <span className={styles.meta_label}>상품상태</span>
                <span className={styles.meta_divider}>:</span>
                <select
                  value={productState}
                  onChange={(e) => setProductState(e.target.value)}
                >
                  <option value="" disabled>
                    선택
                  </option>
                  <option value="S">S : 미개봉(새상품)</option>
                  <option value="A">A : 사용감 거의 없음</option>
                  <option value="B">B : 생활 사용감 있음</option>
                  <option value="C">C : 사용감 많음</option>
                  <option value="D">D : 기능 이상 없음(외관 손상)</option>
                </select>
              </div>

              <div className={`${styles.meta_item} ${styles.region_meta_item}`}>
                <span className={styles.meta_label}>거래지역</span>
                <span className={styles.meta_divider}>:</span>
                <div className={styles.region_select_box}>
                  <input
                    type="text"
                    placeholder="시/군 검색"
                    value={regionLabel}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRegionLabel(value);
                      setRegion(regionMap.get(value) || "");
                      setShowRegionList(true);
                    }}
                    onFocus={() => setShowRegionList(true)}
                    onBlur={handleRegionBlur}
                    className={styles.region_search}
                  />
                  {showRegionList && (
                    <ul className={styles.region_option_list}>
                      {filteredRegions.length > 0 ? (
                        filteredRegions.slice(0, 8).map((regionOption) => (
                          <li
                            key={regionOption.id}
                            className={styles.region_option_item}
                            onMouseDown={() => {
                              setRegionLabel(regionOption.label);
                              setRegion(regionOption.id);
                              setShowRegionList(false);
                            }}
                          >
                            {regionOption.label}
                          </li>
                        ))
                      ) : (
                        <li className={styles.noRegions}>
                          검색 결과가 없습니다.
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              </div>

              <div className={styles.meta_item}>
                <span className={styles.meta_label}>가격</span>
                <span className={styles.meta_divider}>:</span>
                <div className={styles.price_wrapper}>
                  <span className={styles.price_prefix}>₩</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="판매가격"
                    value={displayPrice}
                    onChange={handlePriceChange}
                  />
                  {displayPrice && (
                    <span className={styles.price_suffix}>원</span>
                  )}
                </div>
              </div>
            </div>

            <textarea
              placeholder={descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.bottom_actions}>
          <button type="submit" className={styles.primary_btn}>
            {editItem ? "수정하기" : "등록하기"}
          </button>
          <button
            type="button"
            className={styles.primary_btn}
            onClick={() => navigate(-1)}
          >
            뒤로가기
          </button>
        </div>
      </form>
    </section>
  );
};

export default ProductRegistration;
