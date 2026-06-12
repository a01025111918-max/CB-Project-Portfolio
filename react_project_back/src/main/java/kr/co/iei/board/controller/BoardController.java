package kr.co.iei.board.controller;


import java.io.File;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.iei.admin.model.vo.ProcessReport;
import kr.co.iei.board.model.service.BoardService;
import kr.co.iei.board.model.vo.Board;
import kr.co.iei.board.model.vo.BoardComment;
import kr.co.iei.board.model.vo.BoardLike;
import kr.co.iei.board.model.vo.BoardReport;
import kr.co.iei.board.model.vo.Calco2;
import kr.co.iei.board.model.vo.Marker;
import kr.co.iei.board.model.vo.Report;
import kr.co.iei.member.model.vo.Member;
import kr.co.iei.utils.DeviceParser;
import kr.co.iei.utils.FileUtils;

@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"})
@RestController
@RequestMapping(value="/boards")
public class BoardController {
	@Autowired
	private BoardService boardService;
	
	// application.properties의 file.root 값을 읽어서 파일 업로드/조회 경로를 정함.
	// Windows와 macOS 모두에서 잘 동작하도록 File 객체로 경로를 만듦.
	@Value("${file.root}")
	private String root;

	//게시글 조회
	@GetMapping
	public HashMap<String, Object> selectBoardList(
	        @RequestParam(defaultValue = "0") int status,
	        @RequestParam(defaultValue = "1") int searchType,
	        @RequestParam(defaultValue = "") String searchKeyword,
	        @RequestParam(required = false) String sido,
	        @RequestParam(required = false) String sigungu,
	        @RequestParam(defaultValue = "popular") String sortType 
	) {
		List<Board> list = boardService.selectBoardList(
		        status, searchType, searchKeyword, sido, sigungu, sortType
		);

        List<HashMap<String, Object>> mapped = list.stream()
            .map(board -> {
                HashMap<String, Object> map = new HashMap<>();
                map.put("boardNo", board.getBoardNo());
                map.put("writerId", board.getWriterId());
                map.put("boardTitle", board.getBoardTitle());
                map.put("boardContent", board.getBoardContent());
                map.put("boardThumb", board.getBoardThumb());
                map.put("boardDate", board.getBoardDate());
                map.put("memberNickname", board.getMemberNickname());
                map.put("memberThumb", board.getMemberThumb());
                map.put("boardStatus", board.getBoardStatus());
                map.put("boardLat", board.getBoardLat());
                map.put("boardLng", board.getBoardLng());
                map.put("readCount", board.getReadCount());
                map.put("ctpv", board.getCtpv());
                map.put("sgg", board.getSgg());
                map.put("addr", board.getAddr());
				map.put("memberCo2", board.getMemberCo2());
                map.put("updatedAt", board.getUpdatedAt());
                map.put("writerNickname", board.getWriterNickname());
                map.put("createDate", board.getCreateDate());
                map.put("thumbnailUrl", board.getThumbnailUrl());
                map.put("likeCount", board.getLikeCount());
                map.put("commentCount", board.getCommentCount());
                return map;
            })
            .collect(Collectors.toList());

	    HashMap<String, Object> result = new HashMap<>();
	    result.put("items", mapped);
	    return result;
	}
	//게시글 작성
	@PostMapping
	public HashMap<String, Object> insertBoard(@RequestBody Board board, HttpServletRequest request) {
		String ip = request.getRemoteAddr();
        if (ip.equals("0:0:0:0:0:0:0:1")) {
            ip = "127.0.0.1";
        }
        String device = DeviceParser.parse(request.getHeader("User-Agent"));
	    return boardService.insertBoard(board, ip, device);
	}

	@PostMapping(value = "/calco2")
	public ResponseEntity<?> insertCalco2Data(@ModelAttribute Calco2 calco2) {
		System.out.println("칼카본투:"+calco2);
		int result = boardService.insertCalco2Data(calco2);
		System.out.println(result);
		return ResponseEntity.ok(result);
	}

	@GetMapping(value = "/ctpvsggtot/{ctpv},{sgg}")
	public ResponseEntity<?> selectCo2Tot(@PathVariable String ctpv, @PathVariable String sgg) {
		double cc2 = boardService.selectCo2Tot(ctpv, sgg);
		System.out.println(cc2);
		return ResponseEntity.ok(cc2);
	}


	// 에디터 이미지 업로드 기능임. 업로드된 파일을 서버에 저장하고 URL 경로를 리턴함.
	@PostMapping("/editor/upload")
	public String uploadEditorImage(@RequestParam("upfile") MultipartFile upfile) {
		if (upfile == null || upfile.isEmpty()) {
			throw new RuntimeException("업로드할 파일이 없습니다.");
		}

		String fileName = FileUtils.upload("board/editor", upfile);

		return fileName;
	}
	// public String uploadEditorImage(@RequestParam("upfile") MultipartFile upfile) {
	// 	// 업로드 파일이 없으면 예외 처리
	// 	if (upfile == null || upfile.isEmpty()) {
	// 		throw new RuntimeException("업로드할 파일이 없습니다.");
	// 	}

	// 	// application.properties에 설정된 root 경로 아래 board/editor 폴더로 저장함.
	// 	// 예: file.root=./upload/semiproject/ 인 경우 실제 저장 경로는
	// 	// react_project_back/upload/semiproject/board/editor 가 됩니다.
	// 	File saveDir = new File(new File(root), "board/editor");
	// 	if (!saveDir.exists()) {
	// 		saveDir.mkdirs();
	// 	}

	// 	// Firebase Storage에 업로드하고, 저장된 스토리지 경로를 반환받음.
	// 	String fileName = FileUtils.upload(saveDir.getAbsolutePath() + File.separator, upfile);

	// 	return fileName;
	// }
	
	// 수정
	 // 게시글 수정 요청을 처리하는 API임.
	 // 1) 요청 보낸 사람이 해당 게시글 작성자인지 검사하고,
	 // 2) 작성자가 맞으면 수정 내용을 서비스에 전달함.
	 @PatchMapping("/{boardNo}")
	 public ResponseEntity<?> updateBoard(@PathVariable int boardNo, @RequestBody Board board, @RequestParam String memberId) {
	     if (!boardService.isBoardAuthor(boardNo, memberId)) {
	         return ResponseEntity.status(403).body("작성자만 수정할 수 있습니다.");
	     }
	     // URL에서 받은 boardNo를 객체에 다시 설정함.
	     board.setBoardNo(boardNo);
	     int result = boardService.updateBoard(board);
	     return ResponseEntity.ok(result);
	 }

	 // 삭제
	 @DeleteMapping("/{boardNo}")
	 public ResponseEntity<?> deleteBoard(@PathVariable int boardNo, @RequestParam String memberId) {
	     if (!boardService.isBoardAuthor(boardNo, memberId)) {
	         return ResponseEntity.status(403).body("작성자만 삭제할 수 있습니다.");
	     }
	     int result = boardService.deleteBoard(boardNo);
	     return ResponseEntity.ok(result);
	 }
	 // 게시글 첨부파일 업로드 기능임. 작성된 게시글에 여러 파일을 함께 저장함.
	 @PostMapping("/{boardNo}/files")
	 public int uploadBoardFiles(
	         @PathVariable int boardNo,
	         @RequestParam("files") MultipartFile[] files,
	         @RequestParam("memberId") String memberId
	 ) {
	     return boardService.insertBoardFiles(boardNo, memberId, files);
	 }

	// 게시글 상세 댓글 목록 조회 기능임. 게시글에 달린 댓글을 서버에서 받아옴.
	//  - 댓글 목록은 BoardService.getBoardComments()에서 가져온다.
	//  - 프론트는 이 데이터를 상세 페이지에서 댓글 리스트로 렌더링함.
	@GetMapping("/{boardNo}/comments")
	public ResponseEntity<?> getBoardComments(@PathVariable int boardNo) {
		return ResponseEntity.ok(boardService.getBoardComments(boardNo));
	}

	// 댓글 등록 기능임. 프론트에서 보낸 댓글 내용을 서버에 저장함.
	//  - replyTarget이 있는 경우 parentCommentNo를 함께 전달함.
	//  - isSecret 값에 따라 공개/비공개 댓글이 저장됨.
	@PostMapping("/{boardNo}/comments")
	public ResponseEntity<?> addBoardComment(@PathVariable int boardNo, @RequestBody BoardComment comment, HttpServletRequest request) {
		// 댓글 등록 요청 처리
		// front에서 boardNo는 URL 경로로, 댓글 내용과 작성자 정보는 body로 전달됩니다.
		comment.setBoardNo(boardNo);
		System.out.println("comment:" + comment);
		
		String ip = request.getRemoteAddr();
        if (ip.equals("0:0:0:0:0:0:0:1")) {
            ip = "127.0.0.1";
        }
        String device = DeviceParser.parse(request.getHeader("User-Agent"));
        
		BoardComment saved = boardService.addBoardComment(comment, ip, device);
		return ResponseEntity.ok(saved);
	}

	// 댓글 수정 기능임. 게시글 댓글의 내용을 변경해서 서버에 저장함.
	//  - editTarget이 있는 경우 해당 댓글 번호로 수정 요청을 보냄.
	//  - 수정 시에도 작성자 확인을 서버에서 처리함.
	@PutMapping("/{boardNo}/comments/{commentNo}")
	public ResponseEntity<?> editBoardComment(@PathVariable int boardNo,
	                                         @PathVariable long commentNo,
	                                         @RequestBody BoardComment comment) {
		// 댓글 수정 요청 처리
		// URL 경로로 boardNo와 commentNo를 받으며, body에는 수정 내용과 비공개 여부가 포함됩니다.
		comment.setBoardNo(boardNo);
		comment.setCommentNo(commentNo);
		boardService.editBoardComment(comment);
		return ResponseEntity.ok().build();
	}

	// 댓글 삭제 기능임. 작성자 본인 댓글을 서버에서 제거함.
	//  - 삭제 시 memberId 확인을 통해 본인 여부를 체크함.
	@DeleteMapping("/{boardNo}/comments/{commentNo}")
	public ResponseEntity<?> deleteBoardComment(@PathVariable int boardNo,
	                                           @PathVariable long commentNo,
	                                           @RequestParam String memberId) {
		// 댓글 삭제 요청 처리
		// 요청자는 memberId 쿼리 파라미터로 전달하며 작성자만 삭제할 수 있습니다.
		boardService.removeBoardComment(commentNo, memberId);
		return ResponseEntity.ok().build();
	}

	@GetMapping("/{boardNo}/read")
	public ResponseEntity<?> incrementReadCount(@PathVariable int boardNo) {
		try {
			boardService.incrementReadCount(boardNo);
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.internalServerError().body("조회수 증가 실패: " + e.getMessage());
		}
	}

	@GetMapping("/{boardNo}/likes/{memberId}")
	public ResponseEntity<Boolean> isLiked(@PathVariable int boardNo, @PathVariable String memberId) {
		try {
			return ResponseEntity.ok(boardService.isBoardLiked(boardNo, memberId));
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.internalServerError().build();
		}
	}

	@PostMapping("/{boardNo}/likes")
	public ResponseEntity<?> likeBoard(@PathVariable int boardNo, @RequestParam String memberId) {
		try {
			boardService.addBoardLike(boardNo, memberId);
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.internalServerError().body("좋아요 처리 실패: " + e.getMessage());
		}
	}

	@DeleteMapping("/{boardNo}/likes")
	public ResponseEntity<?> unlikeBoard(@PathVariable int boardNo, @RequestParam String memberId) {
		try {
			boardService.removeBoardLike(boardNo, memberId);
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.internalServerError().body("좋아요 취소 실패: " + e.getMessage());
		}
	}

	// 스크랩 여부 조회 기능임. URL 경로에서 memberId를 받는 방식임.
	@GetMapping("/{boardNo}/tips/{memberId}")
	public ResponseEntity<Boolean> isTiped(@PathVariable int boardNo, @PathVariable String memberId) {
		try {
			return ResponseEntity.ok(boardService.isBoardTiped(boardNo, memberId));
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.internalServerError().build();
		}
	}

	// 스크랩 여부 조회 기능임. query parameter 방식도 받아줌.
	@GetMapping("/{boardNo}/tips")
	public ResponseEntity<Boolean> isTipedByQuery(@PathVariable int boardNo, @RequestParam String memberId) {
		try {
			return ResponseEntity.ok(boardService.isBoardTiped(boardNo, memberId));
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.internalServerError().build();
		}
	}

	// 스크랩 추가 기능임. 이미 스크랩한 내용이면 중복 저장 안 함.
	@PostMapping("/{boardNo}/tips")
	public ResponseEntity<?> tipBoard(@PathVariable int boardNo, @RequestParam String memberId) {
		try {
			boardService.addBoardTip(boardNo, memberId);
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.internalServerError().body("스크랩 처리 실패: " + e.getMessage());
		}
	}

	// 스크랩 취소 기능임. 해당 사용자의 스크랩 기록을 삭제함.
	@DeleteMapping("/{boardNo}/tips")
	public ResponseEntity<?> untipBoard(@PathVariable int boardNo, @RequestParam String memberId) {
		try {
			boardService.removeBoardTip(boardNo, memberId);
			return ResponseEntity.ok().build();
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.internalServerError().body("스크랩 취소 실패: " + e.getMessage());
		}
	}
	 
	// frontend에서 인기 게시글을 조회하기 위해 추가한 엔드포인트입니다.
	// Bestpostlist.jsx에서 /boards/best로 요청하여 top 게시글 목록을 받아옵니다.
	@GetMapping(value="/best")
	public List<BoardLike> bestBoardList(
			@RequestParam(defaultValue = "0") int status
	) {
		return boardService.bestBoardList(status);
	}

	@GetMapping(value="/tips/list")
	public ResponseEntity<List<Board>> getTipBoardList() {
		return ResponseEntity.ok(boardService.getTipBoardList());
	}
	 
	@GetMapping(value="{memberId}")
	public ResponseEntity<?> selectMemberIdBoard(@PathVariable String memberId, @RequestParam(defaultValue = "") String searchBoard, @RequestParam(defaultValue = "2") String filter,
			@RequestParam(defaultValue="1") Integer checker) {
		HashMap<String, Object> map = new HashMap<>();
		map.put("checker", checker);
		map.put("searchBoard", searchBoard);
		map.put("memberId", memberId);
		map.put("filter", filter);
		 List<Board> list = boardService.selectMemberIdBoard(map);
		 return ResponseEntity.ok(list);
	 }
	 
	@GetMapping(value="/markers")
	public ResponseEntity<?> selectMarkers() {
	    List<Marker> list = boardService.selectMarkers();
	    return ResponseEntity.ok(list);
	}

	@GetMapping(value="/boardCount")
	public ResponseEntity<?> selectBoardCount() {
		// 지역별 게시글 개수를 가져오는 API임.
		// 프론트엔드는 이 데이터를 받아서 전체 게시물 수와 지역별 절감 추정값을 계산함.
		List<Board> list = boardService.selectBoardCount();
		return ResponseEntity.ok(list);
	}
	
	@PostMapping(value="board-report")
	public ResponseEntity<?> insertBoardReport(@RequestBody Report report) {
		System.out.println("report: " + report);
		int result = boardService.insertBoardReport(report);
		return ResponseEntity.ok(result);
	}
	@PostMapping(value="comment-report")
	public ResponseEntity<?> insertCommentReport(@RequestBody Report report) {
		System.out.println("report: " + report);
		int result = boardService.insertBoardReport(report);
		return ResponseEntity.ok(result);
	}
	
	
	@GetMapping(value="/detail/{boardNo}")
	public ResponseEntity<?> getBoardDetail(@PathVariable Integer boardNo) {
		Board board = boardService.getBoardDetail(boardNo);
		return ResponseEntity.ok(board);
	}
	
	@GetMapping(value="/report")
	public ResponseEntity<?> getReportList(
										   @RequestParam(defaultValue = "reportDate") String sortBy,
										   @RequestParam(defaultValue = "desc") String sortOrder,
										   @RequestParam(required = false) String type,
										   @RequestParam(required = false) String category,
										   @RequestParam(required = false) Integer status			   
																							) {
		List<Report> reportList = boardService.getReportList(sortBy, sortOrder, type, category, status);
		return ResponseEntity.ok(reportList);
	}
	
	@GetMapping(value="/reportGroup/{targetNo}/{targetType}/{reportNo}")
	public ResponseEntity<?> selectReportGroup(@PathVariable Integer targetNo,
											   @PathVariable String targetType,
											   @PathVariable Integer reportNo)
	{
		List<Report> groupList = boardService.getGroupList(targetNo, targetType, reportNo);
		return ResponseEntity.ok(groupList);
	}
	

	
	
	
	
	 
}
