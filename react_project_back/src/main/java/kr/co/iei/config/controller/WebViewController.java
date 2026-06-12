package kr.co.iei.config.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebViewController {

    // API 요청이나 정적 파일(확장자가 있는 .js, .css 등) 요청을 제외한 
    // 모든 주소 진입 시 리액트의 index.html로 포워딩 (Nginx의 try_files 기능 대체)
    @GetMapping(value = {
        "", 
        "/{path:[^\\.]*}", 
        "/**/{path:[^\\.]*}"
    })
    public String redirect() {
        return "forward:/index.html";
    }
}