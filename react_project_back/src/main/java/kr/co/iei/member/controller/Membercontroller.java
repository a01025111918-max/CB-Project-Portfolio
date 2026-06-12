package kr.co.iei.member.controller;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import kr.co.iei.member.model.service.MemberService;
import kr.co.iei.member.model.vo.LoginMember;
import kr.co.iei.member.model.vo.Member;
import kr.co.iei.point.vo.PointHistory;
import kr.co.iei.utils.DeviceParser;
import kr.co.iei.utils.EmailSender;
import kr.co.iei.utils.FileUtils;
import kr.co.iei.utils.LocationParser;


@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"})
@RestController
@RequestMapping(value = "/members")

public class Membercontroller {

	@Autowired
	private MemberService memberService;

	@Autowired
	private EmailSender emailSender;

	// 회원가입 로직
//	@Autowired
//	private FileUtils fileUtil;

	@Value("${file.root}")
	private String root;

	// 회원가입(김경건)

	@PostMapping
	public ResponseEntity<?> joinMember(@RequestBody Member member) {
		System.out.println("가입 시도 데이터: " + member);
		int result = memberService.insertMember(member);
		return ResponseEntity.ok(result);
	}

	// 아이디 중복 체크 설정 (김경건)
	@GetMapping(value = "/exists")
	public ResponseEntity<?> dupCheckId(@RequestParam String memberId) {
		Member m = memberService.selectOneMember(memberId);
		// 존재하면 Member 객체 반환, 없으면 null
		// 프런트에서 setCheckId(res.data ? 2 : 1);
		// -> 이렇게 설정을 해놨기 때문에 비교문을 통해
		// ->컨트롤러 m == null → true/false 그대로 반환
		return ResponseEntity.ok(m != null);
	}

	// 이메일 검증 로직 (김경건)
	@PostMapping(value = "/email-verification")
	public ResponseEntity<?> sendMail(@RequestBody Member m) {

		// 인증제목 메일 생성
		String emailTitle = "탄소커넥트 인증 메일입니다.";
		// 인증메일용 인증 코드 생성(random활용)
		Random r = new Random();
		StringBuffer sb = new StringBuffer();
		for (int i = 0; i < 6; i++) {
			// 영어 대문자, 소문자, 숫자 조합해서 6자리 랜덤코드 생성
			// 숫자(0-9):r.nextInt(10)
			// 대문자(A-Z): r.nextInt(26)+65
			// 소문자(a-z):r.nextInt(26)+97
			int fleg = r.nextInt(3);// 0.1.2 -> 숫자 대문자 소문자 어떤걸 추출할지 랜덤으로 결정
			if (fleg == 0) {
				int randomCode = r.nextInt(10);
				sb.append(randomCode);

			} else if (fleg == 1) {
				char randomCode = (char) (r.nextInt(26) + 65);
				sb.append(randomCode);
			} else if (fleg == 2) {
				char randomCode = (char) (r.nextInt(26) + 97);
				sb.append(randomCode);
			}
		}
		String authCode = sb.toString();
		String emailContent = "<h1>인증 번호를 확인하세요</h1>" + "<h3>인증번호는 " + "[<b>" + authCode + "</b>] 입니다. </h3>";
		emailSender.sendMail(emailTitle, m.getMemberEmail(), emailContent);
		return ResponseEntity.ok(authCode);
	}

	// 로그인 로직(김경건)
	@PostMapping(value = "/login")
	public ResponseEntity<?> loginMember(@RequestBody Member member, HttpServletRequest request) {
		
		// 로그인 시 정지 여부 체크를 하기위한 로직 status는 영구정지 여부만 판단하고 기간 정지는 lock_until
		Map<String, Object> map = memberService.getLockInfo(member.getMemberId());
		if (map != null) {
		    Integer memberStatus = ((Number) map.get("memberStatus")).intValue();
		    String lockReason = (String) map.get("lockReason");
			// 1. 영구정지 체크
		    if (memberStatus == 1) {
		    	// react에서 Swal text가 아닌 html로 받게함 <br>로 줄바꿈 처리 
		        return ResponseEntity.status(403).body(lockReason +  "<br>" + "자세한 내용은 이메일을 확인해주세요.");
		    }
		    

		    Date lockUntil = (Date) map.get("lockUntil");
		    // 2. 일시정지 체크 (lock_until)
		    if (lockUntil != null && lockUntil.after(new Date())) {
		        SimpleDateFormat sdf = new SimpleDateFormat("MM월 dd일 HH시 mm분");
		        String lockTime = sdf.format(lockUntil);
		        return ResponseEntity.status(403).body(lockReason + "<br>" + lockTime + " 이후 정지가 해제됩니다.");
		    }
		}
		    
		
		
	    LoginMember loginUser = memberService.login(member);
	    
	    String ip = request.getRemoteAddr();
        if (ip.equals("0:0:0:0:0:0:0:1")) {
            ip = "127.0.0.1";
        }
        String device = DeviceParser.parse(request.getHeader("User-Agent"));
        String location = LocationParser.getLocation(ip);
        Map<String, Object> params = new HashMap<>();
        params.put("memberId", member.getMemberId());
        params.put("logIp", ip);
        params.put("logAction", "로그인");
        params.put("logDevice", device);
        params.put("logLocation", location);

	    if (loginUser != null) {
	        if (loginUser.getMemberStatus() != null && loginUser.getMemberStatus() == 1) {
	            return ResponseEntity.status(403).body("정지된 계정입니다. 고객센터로 문의해주세요.");
	        }
	        if (loginUser.getMemberStatus() != null && loginUser.getMemberStatus() == 2) {
	            return ResponseEntity.status(403).body("탈퇴된 계정입니다. 다시 로그인할 수 없습니다.");
	        }
	        memberService.insertLog(params);
	        return ResponseEntity.ok(loginUser);
	    } else {
	    	params.put("logResult", 1);
	    	params.put("logAction", "로그인실패");
	    	memberService.insertLog(params);
	    	memberService.checkFailCount(member.getMemberId());
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("아이디 또는 비밀번호가 일치하지 않습니다.");
	    }
	}
	
	
	//재토큰 발행 로직 (김경건)
	@PostMapping(value = "/refresh")
	// Authentication authentication=> “현재 로그인한 사용자 정보”를 담고 있는 객체
	//직접적으로 Map<String, String> data 사용해서 받아오기.
	//일반적인 zustend에 있는 값을 이용해서 가져올 수가 없었음.
	public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> data){
		// 1. 현재 인증된 사용자의 ID를 꺼내기
		String memberId = data.get("memberId"); // 프론트에서 넘겨준 ID 사용
		
		// 2. 서비스에게 "이 사용자 정보를 바탕으로 새 토큰 세트 좀 만들어줘"라고 요청
	    // 기존에 로그인을 처리하던 서비스 메서드나, 새로 만든 리프레시 전용 메서드를 호출하기
		//Map<String, Object> = 여러 데이터를 한번에 보내기 위한 컨테이너
		//-> 즉 여기에서는 token,endTime을 보내야 해서 Map을 사용
		LoginMember newLogin = memberService.refreshToken(memberId);
		
		// 3. 다시 프론트엔드(Zustand)로 새 토큰과 endTime을 던져줌
		if (newLogin != null) {
	        return ResponseEntity.ok(newLogin);
	    } else {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
	    }
		
	}

	// 아이디 찾기 설정(김경건)
	@PostMapping(value = "/find-id")
	public ResponseEntity<?> findId(@RequestBody Member member) {
		// 아이디 하나로 회원 전체 정보를 가져오는게 아니기떄문에
		// 여기서는 이메일 인증을 통해 아이디 하나만을 조회하는 것이기 떄문에
		// String memberId로 처리
		String memberId = memberService.findIdByEmail(member.getMemberEmail());

		if (memberId != null) {
			String title = "아이디 찾기 결과";
			String content = "<h3>회원님의 아이디는 </h3><h2>" + memberId + "</h2>입니다.";

			emailSender.sendMail(title, member.getMemberEmail(), content);

			// 이메일로 아이디를 보냈기 떄문에 굳이 프런트에 아이디를 줄 필요없음
			// 따라서 리턴할 값을 주지않고 공백처리 해도됨.
			// 하지만 json형태로 데이터가 오기 떄문에 객체 형태로 변환하기 위해서는
			// map형태를 쓰는게 좋음.
			// 그리고 Map.of()를 쓰면 키-값 쌍으로 여러 데이터를 쉽게 묶어서 반환 가능
			// 객체 클래스를 만들지 않아도 여러 필드를 한번에 보내기 좋음
			return ResponseEntity.ok(Map.of("message", "이메일로 아이디를 전송했습니다."

			));

		} else {
			return ResponseEntity.status(404).body("아이디를 찾을 수 없습니다.");
		}
	}

	// 비밀번호 찾기 로직(김경건)
	@PostMapping(value = "/find-pw")
	public ResponseEntity<?> findPw(@RequestBody Member member) {
		// JSON에서 자동으로 매핑된 memberId와 memberEmail 가져오기
		// String memberId = memberService.findIdByEmail(member.getMemberEmail());
		// -> 기존과 같은 방식을 사용할 수는 없음. 조건이 두개 이기 떄문에
		// 따라서 각자 데이터를 받아온뒤
		// 데이터베이스 조회 실행.
		String memberId = member.getMemberId();
		String memberEmail = member.getMemberEmail();

		// 아이디와 이메일이 서버에 존재하는지에 대한 여부
		boolean result = memberService.existsByIdAndEmail(memberId, memberEmail);

		// 서버로부터 아이디가 존재 한다는게 확인이 되면 바로 이메일 인증 발송. 아이디가 조회되지 않으면 그렇지
		// 않다는 메세지를 표시
		if (result) {

			String title = "비밀번호 재설정 안내";

			// 링크 방식 (프런트 reset 페이지로 이동)
			String content = "<h3>비밀번호를 재설정하려면 아래 링크를 클릭하세요</h3>"
					//아래 링크를 클릭하면 해당 페이지로 이동
					+ "<a href='http://localhost:5173/members/reset-pw?memberId=" + member.getMemberId()
					+ "'>비밀번호 재설정하기</a>";
			// 이메일 전송

			emailSender.sendMail(title, member.getMemberEmail(), content);

			return ResponseEntity.ok(Map.of("message", "비밀번호 재설정 링크를 이메일로 전송했습니다."));

		} else {
			// status(HttpStatus.NOT_FOUND)-> status(404)와 동일한 의미

			return ResponseEntity.status(404).body("아이디와 이메일이 일치하지 않습니다.");
		}

	}

	//비밀번호 변경창 설정 로직(로그인 시 비밀번호 찾기 버튼을 눌렀을 때 실행되는 로직)
	//지원씨가 작성해 논 updatePw를 사용해서 memberId로 비밀번호 변경 요청하기 
	@PostMapping (value = "reset-pw")
	public ResponseEntity<?> resetPw(@RequestBody Member member ){
		int result = memberService.resetPw(member);
		
		return ResponseEntity.ok(result);
	}
	
	
	////////////////////////////////////////////////////////////////////////////

	/////////////////////////////////////////////////////////////////////////

	// 회원정보 수정
	@PatchMapping(value = "/{memberId}")
	public ResponseEntity<?> updateMemberInfo(@PathVariable String memberId, @RequestBody Member form) {
		form.setMemberId(memberId);
		System.out.println(form);
		int result = memberService.updateMemberInfo(form);
		return ResponseEntity.ok(result);
	}

	// 회원정보 조회
	@GetMapping(value = "/{memberId}")
	public ResponseEntity<?> getMemberInfo(@PathVariable String memberId) {
		Member member = memberService.getOneMemberInfo(memberId);
		return ResponseEntity.ok(member);
	}

	// 현재 비밀번호 확인
	@PostMapping(value = "/checkauth")
	public ResponseEntity<?> changePw(@RequestBody Member member) {
		boolean result = memberService.checkPw(member);
		return ResponseEntity.ok(result);
	}

	// 새 비밀번호 변경
	@PatchMapping(value = "/newpw")
	public ResponseEntity<?> updatePw(@RequestBody Member m) {
		int result = memberService.updatePw(m);
		return ResponseEntity.ok(result);
	}

	// 썸네일 변경
	@PatchMapping(value = "/{memberId}/thumb")
	public ResponseEntity<?> updateThumb(@PathVariable String memberId, @RequestParam("file") MultipartFile file) {
		if (file == null || file.isEmpty()) {
			throw new RuntimeException("이럴 경우는 없을거임");
		}

		String memberThumb = FileUtils.upload("member", file);
		
		Member mem = new Member();
		mem.setMemberId(memberId);
		mem.setMemberThumb(memberThumb);
		int result = memberService.updateMemberThumb(mem);
		if (result == 1) {
			return ResponseEntity.ok(memberThumb);
		} else {
			return ResponseEntity.ok("파일업로드 안됨");
		}
	}

	@GetMapping
	public ResponseEntity<?> selectMemberList() {
		List<Member> memberList = memberService.selectMemberList();
		return ResponseEntity.ok(memberList);
	}

	@GetMapping(value = "/stats")
	public ResponseEntity<?> selectMemberCarbonStats() {
		Map<String, Object> stats = memberService.selectCarbonStats();
		return ResponseEntity.ok(stats);
	}

	/*
	 * Member mem = new Member(); mem.setMemberId(memberId);
	 * mem.setMemberThumb(memberThumb);
	 * 
	 * int result = memberService.updateMemberThumb(mem); return
	 * ResponseEntity.ok(memberThumb); }
	 */
	// 포인트 조회
	@GetMapping(value = "/{memberId}/point")
	public ResponseEntity<?> selectMemberPoint(@PathVariable String memberId) {
	Integer totalPoint = memberService.selectMemberPoint(memberId);
		return ResponseEntity.ok(totalPoint);
	}
	
	@GetMapping(value = "/{memberId}/point-history")
	public ResponseEntity<?> selectPointHistory(@PathVariable String memberId) {
	    List<PointHistory> pointHistory = memberService.selectPointHistory(memberId);
	    return ResponseEntity.ok(pointHistory);
	}

	@PatchMapping(value = "/{memberId}/leave")
	public ResponseEntity<?> leaveMember(@PathVariable String memberId) {
		int result = memberService.leaveMember(memberId);
		return ResponseEntity.ok(result);
	}
	
	@PostMapping(value="logout/{memberId}")
	public ResponseEntity<?> logoutMember(@PathVariable String memberId, HttpServletRequest request) {
		String ip = request.getRemoteAddr();
		 if (ip.equals("0:0:0:0:0:0:0:1")) {
	            ip = "127.0.0.1";
	        }
		 String device = DeviceParser.parse(request.getHeader("User-Agent"));
		 String location = LocationParser.getLocation(ip);
		 Map<String, Object> params = new HashMap<>();
		 params.put("memberId", memberId);
		 params.put("logIp", ip);
		 params.put("logAction", "로그아웃");
		 params.put("logDevice", device);
		 params.put("logLocation", location);
		 memberService.insertLog(params);
		 return ResponseEntity.ok().build(); // 200 반환 
	}
	
	@GetMapping(value="/rank")
	public ResponseEntity<List<Member>> selectClist() {
		List<Member> list = memberService.selectClist();
		return ResponseEntity.ok(list);
	}
}