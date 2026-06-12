package kr.co.iei.utils;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SpringSecurityConfig {

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
				// cors(cors ->{})=>OPTIONS 요청은 검사하지 말고 CORS로 처리해
				.cors(cors -> {
				}).csrf(csrf -> csrf.disable()) // 필요 시 비활성화
				.authorizeHttpRequests(auth -> auth
						// "/members/login", "/members"-> 직접 회원가입, 로그인 요청의 post 경로를 설정
						// 문제는 그 경로가 아닐 경우 차단;;
						// .requestMatchers("/members/login",
						// "/members","/members/email-verification").permitAll() // permitAll-> 로그인 경로
						// 허용(임시)
						// 이 URL은 로그인 안 해도 들어와도 된다”
						// 현재 토큰이 없는 관계로 이 방식을 통해 리엑트와 연결
						// .anyRequest().authenticated() // 나머지는 인증 필요
						.anyRequest().permitAll() // 모든 요청 허용-> jwt를 만들면 해제
				).formLogin(form -> form.disable()) // 로그인 폼 비활성화 (선택)
				.httpBasic(basic -> basic.disable()); // 기본 인증 비활성화 (선택)

		return http.build();
	}
/////////////////////////////////////////////////////////////////////////////////////
/// 
	@Bean
	public BCryptPasswordEncoder bcrypt() {
		return new BCryptPasswordEncoder();
	}

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // allowCredentials(true) 설정과 함께 allowedOrigins("*")를 쓰면 에러가 발생합니다.
        // 브라우저는 자격 증명 포함 CORS 응답에 대해 Access-Control-Allow-Origin: *를 허용하지 않으므로,
        // 명시적인 origin 목록 대신 allowedOriginPatterns를 사용하여 허용 출처를 지정합니다.
        configuration.setAllowedOriginPatterns(List.of("http://localhost:5173", "http://127.0.0.1:5173","http://192.168.31.28:5173", "http://localhost:9999", "http://localhost:3000", "http://127.0.0.1:3000",
    "http://ec2-13-124-xxx-xxx.ap-northeast-2.compute.amazonaws.com",
    "http://ec2-13-124-xxx-xxx.ap-northeast-2.compute.amazonaws.com:80"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT","PATCH" ,"DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

}



