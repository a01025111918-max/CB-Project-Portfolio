--------------------------------------------------------
--  파일이 생성됨 - 금요일-6월-12-2026   
--------------------------------------------------------

--------------------------------------------------------
--  DDL for Sequence ADMIN_LOG_SEQ
--------------------------------------------------------
CREATE SEQUENCE ADMIN_LOG_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence ALARM_SEQ
--------------------------------------------------------
CREATE SEQUENCE ALARM_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence ATTENDANCE_SEQ
--------------------------------------------------------
CREATE SEQUENCE ATTENDANCE_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence BOARDTEST_SEQ
--------------------------------------------------------
CREATE SEQUENCE BOARDTEST_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence BOARD_FILE_SEQ
--------------------------------------------------------
CREATE SEQUENCE BOARD_FILE_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence BOARD_SEQ
--------------------------------------------------------
CREATE SEQUENCE BOARD_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence CAMPAIGN_NOTICE_SEQ
--------------------------------------------------------
CREATE SEQUENCE CAMPAIGN_NOTICE_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence CAMPAIGN_NO_SEQ
--------------------------------------------------------
CREATE SEQUENCE CAMPAIGN_NO_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence CAMPAIGN_PARTICIPANCE_SEQ
--------------------------------------------------------
CREATE SEQUENCE CAMPAIGN_PARTICIPANCE_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence CAMPAIGN_UPDATE_SEQ
--------------------------------------------------------
CREATE SEQUENCE CAMPAIGN_UPDATE_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence CART_SEQ
--------------------------------------------------------
CREATE SEQUENCE CART_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence CO2_SEQ
--------------------------------------------------------
CREATE SEQUENCE CO2_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence CONTRIBUTION_SEQ
--------------------------------------------------------
CREATE SEQUENCE CONTRIBUTION_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence DONATION_SEQ
--------------------------------------------------------
CREATE SEQUENCE DONATION_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence FAQ_SEQ
--------------------------------------------------------
CREATE SEQUENCE FAQ_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence KEYWORD_SEQ
--------------------------------------------------------
CREATE SEQUENCE KEYWORD_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence LOG_SEQ
--------------------------------------------------------
CREATE SEQUENCE LOG_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence MEMBER_LOG_SEQ
--------------------------------------------------------
CREATE SEQUENCE MEMBER_LOG_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence MISSION_SEQ
--------------------------------------------------------
CREATE SEQUENCE MISSION_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence NOTICE_SEQ
--------------------------------------------------------
CREATE SEQUENCE NOTICE_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence POINT_DONATION_SEQ
--------------------------------------------------------
CREATE SEQUENCE POINT_DONATION_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence POINT_NO_SEQ
--------------------------------------------------------
CREATE SEQUENCE POINT_NO_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence POINT_SEQ
--------------------------------------------------------
CREATE SEQUENCE POINT_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence QNA_SEQ
--------------------------------------------------------
CREATE SEQUENCE QNA_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence REGION_SEQ
--------------------------------------------------------
CREATE SEQUENCE REGION_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence REPORT_SEQ
--------------------------------------------------------
CREATE SEQUENCE REPORT_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence SEQ_BOARD_COMMENT_NO
--------------------------------------------------------
CREATE SEQUENCE SEQ_BOARD_COMMENT_NO
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence SEQ_DONATION_NO
--------------------------------------------------------
CREATE SEQUENCE SEQ_DONATION_NO
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Sequence USER_MISSION_SEQ
--------------------------------------------------------
CREATE SEQUENCE USER_MISSION_SEQ
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999999999999999
  NOCYCLE;

--------------------------------------------------------
--  DDL for Table ADMIN_LOG_TBL
--------------------------------------------------------
CREATE TABLE ADMIN_LOG_TBL (
    LOG_NO INT, 
    ADMIN_ID VARCHAR(20), 
    LOG_TARGET_ID VARCHAR(20), 
    LOG_RESULT VARCHAR(100), 
    LOG_DATE DATETIME DEFAULT CURRENT_TIMESTAMP, 
    LOG_REASON VARCHAR(600), 
    REPORT_NO INT, 
    LOG_ACTION VARCHAR(20)
);

--------------------------------------------------------
--  DDL for Table ALARM_TBL
--------------------------------------------------------
CREATE TABLE ALARM_TBL (
    ALARM_NO INT, 
    MEMBER_ID VARCHAR(20), 
    ALARM_KIND INT, 
    ALARM_CONTENT VARCHAR(1000), 
    ALARM_DATA VARCHAR(2000), 
    ALARM_CHECK INT DEFAULT 0, 
    ALARM_TIME DATETIME DEFAULT CURRENT_TIMESTAMP, 
    ALARM_DEL INT DEFAULT 1, 
    POINT_NO INT
);

--------------------------------------------------------
--  DDL for Table ATTENDANCE_TBL
--------------------------------------------------------
CREATE TABLE ATTENDANCE_TBL (
    ATTENDANCE_NO INT, 
    MEMBER_ID VARCHAR(20), 
    ATTEND_YMD DATETIME, 
    REWARD_POINT INT DEFAULT 0
);

--------------------------------------------------------
--  DDL for Table BOARD_COMMENT_TBL
--------------------------------------------------------
CREATE TABLE BOARD_COMMENT_TBL (
    BOARD_COMMENT_NO INT, 
    BOARD_COMMENT_WRITER VARCHAR(20), 
    BOARD_NO INT, 
    BOARD_COMMENT_CONTENT VARCHAR(1000), 
    BOARD_COMMENT_DATE DATETIME DEFAULT CURRENT_TIMESTAMP, 
    UPDATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP, 
    MEMBER_NICKNAME VARCHAR(30), 
    PARENT_COMMENT_NO INT, 
    COMMENT_GROUP INT, 
    COMMENT_DEPTH INT DEFAULT 0, 
    IS_SECRET CHAR(1) DEFAULT 'N', 
    BOARD_COMMENT_STATUS INT DEFAULT 0
);

--------------------------------------------------------
--  DDL for Table BOARD_FILE_TBL
--------------------------------------------------------
CREATE TABLE BOARD_FILE_TBL (
    FILE_NO INT, 
    BOARD_NO INT, 
    MEMBER_ID VARCHAR(20), 
    BOARD_FILE_NAME VARCHAR(300), 
    BOARD_FILE_PATH VARCHAR(300)
);

--------------------------------------------------------
--  DDL for Table BOARD_LIKE_TBL
--------------------------------------------------------
CREATE TABLE BOARD_LIKE_TBL (
    BOARD_NO INT, 
    MEMBER_ID VARCHAR(20)
);

--------------------------------------------------------
--  DDL for Table BOARD_TBL
--  * 오라클 고유의 IDENTITY 구문을 MySQL의 AUTO_INCREMENT 스타일이나 기본 정의에 맞춰 정리했습니다.
--------------------------------------------------------
CREATE TABLE BOARD_TBL (
    BOARD_NO INT NOT NULL AUTO_INCREMENT, 
    WRITER_ID VARCHAR(20), 
    BOARD_TITLE VARCHAR(1000), 
    BOARD_CONTENT VARCHAR(4000), 
    BOARD_THUMB VARCHAR(300), 
    BOARD_DATE DATETIME DEFAULT CURRENT_TIMESTAMP, 
    MEMBER_NICKNAME VARCHAR(30), 
    BOARD_STATUS DECIMAL(1,0) DEFAULT 0, 
    BOARD_LAT DOUBLE, -- 위도는 소수점 표현을 위해 DOUBLE로 변경
    BOARD_LNG DOUBLE, -- 경도는 소수점 표현을 위해 DOUBLE로 변경
    READ_COUNT INT DEFAULT 0, 
    CTPV VARCHAR(50), 
    SGG VARCHAR(50), 
    UPDATED_AT DATETIME, 
    ADDR VARCHAR(100),
    PRIMARY KEY (BOARD_NO)
);

--------------------------------------------------------
--  DDL for Table CAMPAIGN_EXILE_TBL
--------------------------------------------------------
CREATE TABLE CAMPAIGN_EXILE_TBL (
    MEMBER_ID VARCHAR(30), 
    CAMPAIGN_NO INT, 
    CAMPAIGN_EXILE_REASON VARCHAR(1000)
);

--------------------------------------------------------
--  DDL for Table CAMPAIGN_MEMBER_TBL
--------------------------------------------------------
CREATE TABLE CAMPAIGN_MEMBER_TBL (
    MEMBER_ID VARCHAR(30), 
    CAMPAIGN_NO INT
);

--------------------------------------------------------
--  DDL for Table CAMPAIGN_NOTICE_TBL
--------------------------------------------------------
CREATE TABLE CAMPAIGN_NOTICE_TBL (
    CAMPAIGN_NOTICE_NO INT, 
    CAMPAIGN_NOTICE_TITLE VARCHAR(1000), 
    CAMPAIGN_NOTICE_CONTENT VARCHAR(2000), 
    CAMPAIGN_NOTICE_WRITER VARCHAR(30), 
    CAMPAIGN_NO INT, 
    CAMPAIGN_NOTICE_DATE DATETIME
);

--------------------------------------------------------
--  DDL for Table CAMPAIGN_PARTICIPANCE_TBL
--------------------------------------------------------
CREATE TABLE CAMPAIGN_PARTICIPANCE_TBL (
    CAMPAIGN_PARTICIPANCE_NO INT, 
    CAMPAIGN_THUMB VARCHAR(300), 
    CAMPAIGN_MEMO VARCHAR(500), 
    CAMPAIGN_NO INT, 
    CAMPAIGN_MEMO_UPLOAD_DATE DATETIME, 
    CAMPAIGN_EXPIRE_DATE DATETIME, 
    MEMBER_ID VARCHAR(20)
);

--------------------------------------------------------
--  DDL for Table CAMPAIGN_UPDATE_TBL
--------------------------------------------------------
CREATE TABLE CAMPAIGN_UPDATE_TBL (
    CAMPAIGN_UPDATE_NO INT, 
    CAMPAIGN_TITLE VARCHAR(1000), 
    CAMPAIGN_EXPLANATION VARCHAR(2000), 
    CAMPAIGN_GOAL_MEMBER INT, 
    CAMPAIGN_NO INT
);

--------------------------------------------------------
--  DDL for Table CARBON_ELE_TBL
--------------------------------------------------------
CREATE TABLE CARBON_ELE_TBL (
    CTPVSGG_ID CHAR(8), 
    CARBON_ELE_JAN DOUBLE, -- 탄소량 수치는 소수점이 나올 수 있으므로 DOUBLE 추천
    CARBON_ELE_FEB DOUBLE, 
    CARBON_ELE_MAR DOUBLE, 
    CARBON_ELE_APR DOUBLE, 
    CARBON_ELE_MAY DOUBLE, 
    CARBON_ELE_JUN DOUBLE, 
    CARBON_ELE_JUL DOUBLE, 
    CARBON_ELE_AUG DOUBLE, 
    CARBON_ELE_SEP DOUBLE, 
    CARBON_ELE_OCT DOUBLE, 
    CARBON_ELE_NOV DOUBLE, 
    CARBON_ELE_DEC DOUBLE, 
    CARBON_ELE_TOT DOUBLE
);

--------------------------------------------------------
--  DDL for Table CARBON_GAS_TBL
--------------------------------------------------------
CREATE TABLE CARBON_GAS_TBL (
    CTPVSGG_ID CHAR(8), 
    CARBON_GAS_JAN DOUBLE, 
    CARBON_GAS_FEB DOUBLE, 
    CARBON_GAS_MAR DOUBLE, 
    CARBON_GAS_APR DOUBLE, 
    CARBON_GAS_MAY DOUBLE, 
    CARBON_GAS_JUN DOUBLE, 
    CARBON_GAS_JUL DOUBLE, 
    CARBON_GAS_AUG DOUBLE, 
    CARBON_GAS_SEP DOUBLE, 
    CARBON_GAS_OCT DOUBLE, 
    CARBON_GAS_NOV DOUBLE, 
    CARBON_GAS_DEC DOUBLE, 
    CARBON_GAS_TOT DOUBLE
);

--------------------------------------------------------
--  DDL for Table CARBON_HEAT_TBL
--------------------------------------------------------
CREATE TABLE CARBON_HEAT_TBL (
    CTPVSGG_ID CHAR(8), 
    CARBON_HEAT_JAN DOUBLE, 
    CARBON_HEAT_FEB DOUBLE, 
    CARBON_HEAT_MAR DOUBLE, 
    CARBON_HEAT_APR DOUBLE, 
    CARBON_HEAT_MAY DOUBLE, 
    CARBON_HEAT_JUN DOUBLE, 
    CARBON_HEAT_JUL DOUBLE, 
    CARBON_HEAT_AUG DOUBLE, 
    CARBON_HEAT_SEP DOUBLE, 
    CARBON_HEAT_OCT DOUBLE, 
    CARBON_HEAT_NOV DOUBLE, 
    CARBON_HEAT_DEC DOUBLE, 
    CARBON_HEAT_TOT DOUBLE
);

--------------------------------------------------------
--  DDL for Table CARBON_TBL
--------------------------------------------------------
CREATE TABLE CARBON_TBL (
    CTPVSGG_ID CHAR(8), 
    REGION_NO INT, 
    CARBON_ROAD_TCO2 DOUBLE, 
    CARBON_TREE_TCO2 DOUBLE, 
    CARBON_YEAR INT DEFAULT 2024
);

--------------------------------------------------------
--  DDL for Table CART_TBL
--------------------------------------------------------
CREATE TABLE CART_TBL (
    CART_NO INT, 
    MEMBER_ID VARCHAR(20), 
    MARKET_NO INT, 
    QUANTITY INT, 
    ADDED_AT DATETIME
);

--------------------------------------------------------
--  DDL for Table CO2_TBL
--------------------------------------------------------
CREATE TABLE CO2_TBL (
    C_NO INT, 
    BOARD_NO INT, 
    MEMBER_ID VARCHAR(20), 
    CTPVSGG_ID CHAR(8), 
    C_ELE_A DOUBLE DEFAULT 0, 
    C_ELE DOUBLE DEFAULT 0, 
    C_GAS_A DOUBLE DEFAULT 0, 
    C_GAS DOUBLE DEFAULT 0, 
    C_WATER_A DOUBLE DEFAULT 0, 
    C_WATER DOUBLE DEFAULT 0, 
    C_ROAD_A DOUBLE DEFAULT 0, 
    C_ROAD DOUBLE DEFAULT 0, 
    C_WASTE_A DOUBLE DEFAULT 0, 
    C_WASTE DOUBLE DEFAULT 0, 
    C_TOTAL DOUBLE DEFAULT 0
);

--------------------------------------------------------
--  DDL for Table CREATE_CAMPAIGN_TBL
--------------------------------------------------------
CREATE TABLE CREATE_CAMPAIGN_TBL (
    CAMPAIGN_NO INT, 
    CAMPAIGN_TITLE VARCHAR(1000), 
    CAMPAIGN_EXPLANATION VARCHAR(2000), 
    CAMPAIGN_STATUS INT, 
    CAMPAIGN_GOAL_MEMBER INT, 
    CAMPAIGN_EXPIRE_DATE DATETIME, 
    MEMBER_ID VARCHAR(20), 
    CAMPAIGN_START_DATE DATETIME
);

--------------------------------------------------------
--  DDL for Table CTPVSGG_TBL
--------------------------------------------------------
CREATE TABLE CTPVSGG_TBL (
    CTPVSGG_ID CHAR(8), 
    CTPV_CD INT, 
    SGG_CD INT, 
    CTPV_NM VARCHAR(50), 
    SGG_NM VARCHAR(50)
);

--------------------------------------------------------
--  DDL for Table DONATION_GROUP
--------------------------------------------------------
CREATE TABLE DONATION_GROUP (
    GROUP_ID VARCHAR(50), 
    GROUP_NAME VARCHAR(100), 
    GROUP_DESC VARCHAR(500), 
    GROUP_IMG VARCHAR(200), 
    CATEGORY VARCHAR(50), 
    TOTAL_POINTS INT DEFAULT 0, 
    VIRTUAL_ACCOUNT VARCHAR(50)
);

--------------------------------------------------------
--  DDL for Table FAQ_TBL
--------------------------------------------------------
CREATE TABLE FAQ_TBL (
    FAQ_NO INT, 
    FAQ_TITLE VARCHAR(200), 
    FAQ_CONTENT VARCHAR(600), 
    FAQ_CATEGORY VARCHAR(50)
);

--------------------------------------------------------
--  DDL for Table KEYWORD_TBL
--------------------------------------------------------
CREATE TABLE KEYWORD_TBL (
    KEYWORD_NO INT, 
    KEYWORD VARCHAR(100), 
    KEYWORD_CATEGORY VARCHAR(50)
);

--------------------------------------------------------
--  DDL for Table MEMBER_LOG_TBL
--------------------------------------------------------
CREATE TABLE MEMBER_LOG_TBL (
    MEMBER_LOG_NO INT, 
    MEMBER_ID VARCHAR(20), 
    LOG_IP VARCHAR(30), 
    LOG_TIME DATETIME DEFAULT CURRENT_TIMESTAMP, 
    LOG_ACTION VARCHAR(20), 
    LOG_DETAIL VARCHAR(80), 
    LOG_DEVICE VARCHAR(200), 
    LOG_LOCATION VARCHAR(100), 
    LOG_RESULT INT, 
    LOG_ALERT VARCHAR(50)
);

--------------------------------------------------------
--  DDL for Table MEMBER_MISSION_TBL
--------------------------------------------------------
CREATE TABLE MEMBER_MISSION_TBL (
    USER_MISSION_NO INT, 
    MISSION_NO INT, 
    MEMBER_ID VARCHAR(20), 
    COMPLETED_YMD DATE DEFAULT (CURRENT_DATE), -- TRUNC(SYSDATE)를 날짜형 기본값으로 처리
    CERT_IMAGE_URL VARCHAR(255), 
    ASSIGNED_YMD DATE DEFAULT (CURRENT_DATE)
);

--------------------------------------------------------
--  DDL for Table MEMBER_POINT_TBL
--------------------------------------------------------
CREATE TABLE MEMBER_POINT_TBL (
    MEMBER_ID VARCHAR(20), 
    TOTAL_POINT INT DEFAULT 0
);

--------------------------------------------------------
--  DDL for Table MEMBER_TBL
--------------------------------------------------------
CREATE TABLE MEMBER_TBL (
    MEMBER_ID VARCHAR(20), 
    MEMBER_PW CHAR(60), 
    MEMBER_NAME VARCHAR(30), 
    MEMBER_GRADE INT DEFAULT 2, 
    MEMBER_EMAIL VARCHAR(30), 
    MEMBER_THUMB VARCHAR(300), 
    ENROLL_DATE DATETIME, 
    MEMBER_STATUS INT, 
    MANNER_SCORE INT, 
    TRADE_COUNT INT, 
    MEMBER_NICKNAME VARCHAR(100)
);

--------------------------------------------------------
--  DDL for Table MEMBER_TBL1
--------------------------------------------------------
CREATE TABLE MEMBER_TBL1 (
    MEMBER_ID VARCHAR(20), 
    MEMBER_PW CHAR(60), 
    MEMBER_NAME VARCHAR(30), 
    MEMBER_GRADE INT, 
    MEMBER_NICKNAME VARCHAR(100), 
    MEMBER_EMAIL VARCHAR(30), 
    MEMBER_THUMB VARCHAR(300), 
    ENROLL_DATE DATETIME, 
    MEMBER_STATUS INT, 
    MANNER_SCORE INT, 
    TRADE_COUNT INT, 
    MEMBER_TOTAL_POINT INT, 
    LOCK_UNTIL DATETIME, 
    MEMBER_CO2 DOUBLE DEFAULT 0, 
    LOCK_REASON VARCHAR(600)
);

--------------------------------------------------------
--  DDL for Table MEMBER_TBL2
--------------------------------------------------------
CREATE TABLE MEMBER_TBL2 (
    MEMBER_ID VARCHAR(20), 
    MEMBER_PW CHAR(60), 
    MEMBER_NAME VARCHAR(30), 
    MEMBER_GRADE INT, 
    MEMBER_EMAIL VARCHAR(30), 
    MEMBER_THUMB VARCHAR(300), 
    ENROLL_DATE DATETIME, 
    MEMBER_STATUS INT, 
    MANNER_SCORE INT, 
    TRADE_COUNT INT, 
    MEMBER_NICKNAME VARCHAR(30)
);

--------------------------------------------------------
--  DDL for Table MISSION_TBL (마지막 잘린 부분 마감 처리)
--------------------------------------------------------
CREATE TABLE MISSION_TBL (
    MISSION_NO INT, 
    MISSION_TITLE VARCHAR(300), 
    REWARD_POINT INT, 
    MISSION_IMAGE_URL VARCHAR(255), 
    MISSION_TYPE VARCHAR(20), 
    VALIDATION_LABEL VARCHAR(100), 
    VALIDATION_PROMPT VARCHAR(1000)
);