package kr.co.iei.board.model.service;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import kr.co.iei.admin.model.vo.ProcessReport;
import kr.co.iei.board.model.dao.BoardDao;
import kr.co.iei.board.model.vo.Board;
import kr.co.iei.board.model.vo.BoardComment;
import kr.co.iei.board.model.vo.BoardFile;
import kr.co.iei.board.model.vo.BoardLike;
import kr.co.iei.board.model.vo.BoardReport;
import kr.co.iei.board.model.vo.Calco2;
import kr.co.iei.board.model.vo.Marker;
import kr.co.iei.board.model.vo.Report;
import kr.co.iei.member.model.service.MemberService;
import kr.co.iei.member.model.vo.Member;
import kr.co.iei.mission.model.service.MissionService;
import kr.co.iei.utils.FileUtils;

@Service
public class BoardService {
	@Autowired
	private BoardDao boardDao;
	
	@Autowired
	private MissionService missionService;
	
	@Autowired
	private MemberService memberService;

	@Value("${file.root}")
	private String root;
	
	
	//게시글 조회
	// 검색 조건을 받아서 BoardDao.selectBoardList()에 전달하고,
	// DB에서 게시글 리스트를 조회해서 결과를 반환함.
	public List<Board> selectBoardList(int status, int searchType, String searchKeyword, String sido,
	        String sigungu, String sortType) {
	    HashMap<String, Object> param = new HashMap<>();
	    param.put("status", status);
	    param.put("searchType", searchType);
	    param.put("searchKeyword", searchKeyword);
	    param.put("sido", sido);
	    param.put("sigungu", sigungu);
	    param.put("sortType", sortType);

	    return boardDao.selectBoardList(param);
	}
	//게시글 작성
	@Transactional
	public HashMap<String, Object> insertBoard(Board board, String ip, String device) {
	    HashMap<String, Object> resultMap = new HashMap<>();

	    int result = boardDao.insertBoard(board);

	    boolean pointAwarded = false;

	    if (result > 0) {
	        int missionResult = missionService.completeBasicMission(board.getWriterId());
	        pointAwarded = missionResult == 1;
	        
	        Map<String, Object> logParams = new HashMap<>();
	        logParams.put("memberId", board.getWriterId());
	        logParams.put("logIp", ip);      
	        logParams.put("logAction", "게시글작성");
	        logParams.put("logDevice", device);
	        logParams.put("logDetail", board.getBoardNo() + " | " + board.getBoardTitle());
	        memberService.insertLog(logParams);
	    }

	    resultMap.put("boardNo", board.getBoardNo());
	    resultMap.put("pointAwarded", pointAwarded);
	    resultMap.put("result", result);

	    return resultMap;
	}
	//탄소계산기
	@Transactional
    public int insertCalco2Data(Calco2 calco2) {
		String ctpvsggId = boardDao.selectstpvsgg(calco2.getCtpv(),calco2.getSgg());
		calco2.setCtpvsggId(ctpvsggId);
        int result = boardDao.insertCalco2Data(calco2);
		double cc2 = boardDao.selectCo2Tot(ctpvsggId);
		double co2 = cc2 - calco2.getCTotal();
		double memberCo2 = boardDao.selectMemberCo2(calco2);
		double saveco2 = co2 + memberCo2;
		String textco2 = String.format("%.8f", saveco2);
		double membercalco2 = Double.parseDouble(textco2);
		int resultMember = boardDao.updateCo2(membercalco2, calco2.getMemberId());
		if (resultMember<=0 && result<=0) {
			result = -1;
		}
		return result;
    }

	public double selectCo2Tot(String ctpv, String sgg) {
		String ctpvsggId = boardDao.selectstpvsgg(ctpv, sgg);
		double co2 = boardDao.selectCo2Tot(ctpvsggId);
		String textco2 = String.format("%.8f", co2);
		double cc2 = Double.parseDouble(textco2);
		return cc2;
	}


	//게시글 수정
	// 프론트에서 수정된 게시글 데이터를 받아서 DB에 반영하는 역할임.
	// BoardDao.updateBoard()가 실제로 SQL을 호출함.
	public int updateBoard(Board board) {
	    return boardDao.updateBoard(board);
	}

	// 게시글 삭제
	@Transactional
	public int deleteBoard(int boardNo) {
	    try {
            // 게시글 삭제 전에 종속된 관련 데이터를 먼저 정리함.
            // foreign key 제약이나 데이터를 참조하는 자식 레코드가 있으면 삭제가 실패할 수 있음.
            boardDao.deleteBoardFilesByBoardNo(boardNo);
            boardDao.deleteBoardCommentsByBoardNo(boardNo);
            boardDao.deleteBoardLikesByBoardNo(boardNo);
            boardDao.deleteBoardTipsByBoardNo(boardNo);
            boardDao.deleteBoardReportsByBoardNo(boardNo);

            return boardDao.deleteBoard(boardNo);

	    } catch (Exception e) {
	        e.printStackTrace();
	        throw e;
	    }
	}

	public int incrementReadCount(int boardNo) {
		return boardDao.incrementReadCount(boardNo);
	}

	public int addBoardLike(int boardNo, String memberId) {
		return boardDao.insertBoardLike(boardNo, memberId);
	}

	public int removeBoardLike(int boardNo, String memberId) {
		return boardDao.deleteBoardLike(boardNo, memberId);
	}

	// 댓글 목록 조회 기능임. 게시글 번호로 댓글 리스트를 가져옴.
	//  - BoardDao.selectBoardComments()를 통해 DB에서 데이터를 읽어옴.
	//  - 작성자 썸네일이 누락된 경우 회원 정보를 통해 보강함.
	public List<BoardComment> getBoardComments(int boardNo) {
		List<BoardComment> comments = boardDao.selectBoardComments(boardNo);
		if (comments == null || comments.isEmpty()) {
			return comments;
		}

		Map<String, Member> memberCache = new HashMap<>();
		for (BoardComment comment : comments) {
			String memberId = comment.getMemberId();
			String thumb = comment.getMemberThumb();
			if (memberId == null || (thumb != null && !thumb.trim().isEmpty() && !thumb.trim().equalsIgnoreCase("null") && !thumb.trim().equalsIgnoreCase("undefined"))) {
				continue;
			}

			Member member = memberCache.computeIfAbsent(memberId, id -> memberService.selectOneMember(id));
			if (member != null) {
				if (comment.getMemberThumb() == null || comment.getMemberThumb().trim().isEmpty() || comment.getMemberThumb().trim().equalsIgnoreCase("null") || comment.getMemberThumb().trim().equalsIgnoreCase("undefined")) {
					comment.setMemberThumb(member.getMemberThumb());
				}
				if (comment.getMemberNickname() == null || comment.getMemberNickname().isEmpty()) {
					comment.setMemberNickname(member.getMemberNickname());
				}
			}
		}
		return comments;
	}

	// 댓글 등록 기능임. 새 댓글을 DB에 저장하고 저장된 댓글 객체를 리턴함.
	//  - 댓글 번호는 MyBatis selectKey로 자동 생성됨.
	//  - 부모 댓글 번호가 있으면 대댓글로 저장됨.
	@Transactional // 없길래 붙임 
	public BoardComment addBoardComment(BoardComment comment, String ip, String device) {
		boardDao.insertBoardComment(comment);
        // 새로 추가된 댓글에도 작성자 썸네일이 들어가도록 채워줌.
        // 이 값은 프론트에서 댓글 리스트에 바로 아바타를 보여주기 위함임.
        if (comment.getMemberId() != null) {
            Member member = memberService.selectOneMember(comment.getMemberId());
            if (member != null) {
                comment.setMemberThumb(member.getMemberThumb());
                if (comment.getMemberNickname() == null || comment.getMemberNickname().isEmpty()) {
                    comment.setMemberNickname(member.getMemberNickname());
                }
            }
        }
        Map<String, Object> logParams = new HashMap<>();
        logParams.put("memberId", comment.getMemberId());
        logParams.put("logIp", ip);
        logParams.put("logAction", "댓글작성");
        logParams.put("logDevice", device);
        String detail = comment.getContent();
        if (detail.length() > 10) {
            detail = detail.substring(0, 10) + "...";
        }
        logParams.put("logDetail", comment.getBoardNo() + " | " + detail);
        memberService.insertLog(logParams);
		return comment;
	}

	// 댓글 수정 기능임. 댓글 내용을 변경해서 DB에 반영함.
	public int editBoardComment(BoardComment comment) {
		return boardDao.updateBoardComment(comment);
	}

	// 댓글 삭제 기능임. 해당 사용자의 댓글을 DB에서 지움.
	public int removeBoardComment(long commentNo, String memberId) {
		return boardDao.deleteBoardComment(commentNo, memberId);
	}

	public boolean isBoardLiked(int boardNo, String memberId) {
		return boardDao.selectBoardLikeByMember(boardNo, memberId) > 0;
	}

	// 스크랩 추가 기능임. 이미 같은 사람이 스크랩했으면 또 추가 안 함.
	public int addBoardTip(int boardNo, String memberId) {
		if (isBoardTiped(boardNo, memberId)) {
			return 0;
		}
		return boardDao.insertBoardTip(boardNo, memberId);
	}

	// 스크랩 삭제 기능임. tip_tbl에서 이 회원의 스크랩 기록을 지움.
	public int removeBoardTip(int boardNo, String memberId) {
		return boardDao.deleteBoardTip(boardNo, memberId);
	}

	// 스크랩 여부 확인 기능임. 이 회원이 이 게시물을 스크랩했는지 확인함.
	public boolean isBoardTiped(int boardNo, String memberId) {
		return boardDao.selectBoardTipByMember(boardNo, memberId) > 0;
	}

	public boolean isBoardAuthor(int boardNo, String writerId) {
		return boardDao.selectBoardAuthor(boardNo, writerId) > 0;
	}
	// 게시글 첨부파일 저장 기능임. 여러 파일을 서버에 업로드하고 DB에 경로를 저장함.
	@Transactional
	public int insertBoardFiles(int boardNo, String memberId, MultipartFile[] files) {
		int result = 0;
		for (MultipartFile file : files) {
			if (file == null || file.isEmpty()) continue;

			String filePath = FileUtils.upload("board/files", file);  // ← 수정

			BoardFile boardFile = new BoardFile();
			boardFile.setBoardNo(boardNo);
			boardFile.setMemberId(memberId);
			boardFile.setBoardFileName(filePath);
			boardFile.setBoardFilePath(filePath);
			result += boardDao.insertBoardFile(boardFile);
		}
		return result;
	}
	// 인기 게시글 조회 비즈니스 로직
	// BoardController.bestBoardList()에서 호출되어 DAO에서 결과를 가져옵니다.
	public List<BoardLike> bestBoardList(int status) {
		HashMap<String, Object> param = new HashMap<>();
		param.put("status", status);
		return boardDao.bestBoardList(param);
	}
	
	public List<Board> selectMemberIdBoard(HashMap<String, Object> map) {
		Integer checker = (Integer)(map.get("checker"));
		if(checker ==1) {
			List<Board> list = boardDao.selectMemberIdBoard(map);
			return list;
		}
		if(checker == 2) {
			String memberId = map.get("memberId").toString();
			List<Integer> boardNoList = boardDao.selectLikeBoard(memberId);
			// 좋아요한 게시글 ID 목록이 없으면
			// 쿼리 조건에 넣을 값이 없어서 잘못된 조회가 될 수 있음.
			// 그래서 빈 목록이면 바로 빈 결과를 반환함.
			if (boardNoList == null || boardNoList.isEmpty()) {
				return new ArrayList<>();
			}
			map.put("boardNoList", boardNoList);
			System.out.println(boardNoList);
			List<Board> list = boardDao.selectMemberIdBoard(map);
			return list;
		}
		if(checker == 3) {
			String memberId = map.get("memberId").toString();
			List<Integer> tipList = boardDao.selectTipBoard(memberId);
			// 스크랩한 게시글 ID 목록이 없으면
			// 조건에 들어갈 값이 없어서 잘못된 조회가 될 수 있음.
			// 그래서 빈 목록이면 바로 빈 결과를 반환함.
			if (tipList == null || tipList.isEmpty()) {
				return new ArrayList<>();
			}
			map.put("tipList", tipList);
			List<Board> list = boardDao.selectMemberIdBoard(map);
			return list;
		}
		else {
			return null;
		}
	}

	public List<Board> getTipBoardList() {
		return boardDao.selectTipBoardList();
	}

	public List<Marker> selectMarkers() {
		List<Marker> list = boardDao.selectMarkers();		
		return list;
	}
	
	@Transactional
	public int insertBoardReport(Report report) {
		int check = boardDao.checkReport(report);
		if (check > 0) {
			return -1;
		}
		
		return boardDao.insertBoardReport(report);
	}

	public Board getBoardDetail(Integer boardNo) {
		Board board = boardDao.getBoardDetail(boardNo);
		return board;
	}
	public List<Report> getReportList(String sortBy, String sortOrder, String type, String category, Integer status) {
		List<Report> reportList = boardDao.getReportList(sortBy, sortOrder, type, category, status);
		return reportList;
	}
	// 지역별 게시글 개수를 조회하는 서비스 메서드임.
	// 이 메서드는 DAO에서 값을 받아와서 컨트롤러에 그대로 전달함.
	// 프론트에서는 이 데이터를 이용해 지도 상의 지역 통계를 계산함.
	public List<Board> selectBoardCount() {
		List<Board> list = boardDao.selectBoardCount();
		return list;
	}
	public List<Report> getGroupList(Integer targetNo, String targetType, Integer reportNo) {
		List<Report> groupList = boardDao.getGroupList(targetNo, targetType, reportNo);
		return groupList;
	}
	

	

}

