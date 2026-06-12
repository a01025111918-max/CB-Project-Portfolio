package kr.co.iei.support.contoller;

import java.io.File;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import kr.co.iei.admin.model.vo.Faq;
import kr.co.iei.admin.model.vo.Notice;
import kr.co.iei.admin.model.vo.Qna;
import kr.co.iei.support.model.service.SupportService;
import kr.co.iei.utils.FileUtils;

@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"})
@RequestMapping(value="supports")
@RestController

public class SupportContoller {
	@Autowired
	private SupportService supportService;
	
	@Value("${file.root}")
	private String root;
	
	
	@GetMapping(value="faq")
	public ResponseEntity<?> selectFaqList(@RequestParam (required = false) String category) {
		List<Faq> faqList = supportService.selectFaqList(category);
		return ResponseEntity.ok(faqList);
	}
	
	@GetMapping(value="notice")
	public ResponseEntity<?> selectNoticeList(@RequestParam (required = false) String category) {
		List<Notice> noticeList = supportService.selectNoticeList(category);
		return ResponseEntity.ok(noticeList);
	}
	
	@GetMapping(value="notice/{noticeNo}")
	public ResponseEntity<?> selectNoticeDetail(@PathVariable Integer noticeNo) {
		Notice notice = supportService.selectNoticeDetail(noticeNo);
		return ResponseEntity.ok(notice);
	}
	
	@GetMapping(value="qna")
	public ResponseEntity<?> selectQnaList(@RequestParam String memberId) {
		List<Qna> qnaList = supportService.selectQnaList(memberId);
		return ResponseEntity.ok(qnaList);
	}
	
	@PostMapping(value="qna")
public ResponseEntity<?> insertQna(@ModelAttribute Qna qna, @RequestParam(value="upfile", required = false) MultipartFile upfile) {
    if (upfile != null && !upfile.isEmpty()) {
        String fileName = FileUtils.upload("qna", upfile);
        qna.setQnaQuestionImage(fileName);
    }
    int result = supportService.insertQna(qna);
    return ResponseEntity.ok(result);
}
	
	@GetMapping(value="qna/{qnaNo}")
	public ResponseEntity<?> selectQanDetail(@PathVariable Integer qnaNo) {
		Qna qna = supportService.selectQnaDetail(qnaNo);
		return ResponseEntity.ok(qna);
	}
	
}
