package kr.co.iei.utils;

import java.io.File;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import com.google.cloud.storage.Bucket;
import com.google.cloud.storage.Blob;
import com.google.firebase.cloud.StorageClient;

@Component
public class FileUtils {
    
    private static final String BASE_PATH = "C:/Temp/semiproject/";

    public static String upload(String savepath, MultipartFile file) {
        // savepath 예시: "board", "member", "board/editor" 등
        String folderPath = BASE_PATH + savepath;
        if (!folderPath.endsWith("/")) {
            folderPath += "/";
        }

        // 폴더 없으면 생성
        File dir = new File(folderPath);
        if (!dir.exists()) {
            dir.mkdirs();
        }

        // UUID 기반 파일명 생성
        String originalName = file.getOriginalFilename();
        String extension = "";
        if (originalName != null) {
            int dotIndex = originalName.lastIndexOf('.');
            if (dotIndex >= 0) {
                extension = originalName.substring(dotIndex);
            }
        }
        String filename = UUID.randomUUID().toString() + extension;

        // 파일 저장
        File dest = new File(folderPath + filename);
        try {
            file.transferTo(dest);
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }

        // DB에 저장할 상대 경로 반환 (savepath/파일명)
        return savepath + "/" + filename;
    }

    // public static String upload(String savepath, MultipartFile file) {
    //     // savepath는 기존 로컬 저장 경로로 전달됩니다.
    //     // Firebase Storage에서는 해당 경로를 내부 객체 경로로 변환합니다.
    //     String storageFolder = toStorageFolder(savepath);

    //     // 원본 파일명에서 확장자만 추출합니다.
    //     String originalName = file.getOriginalFilename();
    //     String extension = "";
    //     if (originalName != null) {
    //         int dotIndex = originalName.lastIndexOf('.');
    //         if (dotIndex >= 0) {
    //             extension = originalName.substring(dotIndex);
    //         }
    //     }

    //     // UUID 기반 파일명 생성: 충돌 방지 및 파일명 인코딩 문제 회피
    //     String filename = UUID.randomUUID().toString() + extension;
    //     String objectName = storageFolder.isEmpty() ? filename : storageFolder + filename;

    //     // Firebase Storage에만 업로드합니다.
    //     try {
    //         Bucket bucket = StorageClient.getInstance().bucket();
    //         Blob blob = bucket.create(objectName, file.getBytes(), file.getContentType());
    //         if (blob != null) {
    //             blob = blob.toBuilder()
    //                     .setCacheControl("public, max-age=31536000, immutable")
    //                     .build()
    //                     .update();
    //         }

    //         String encodedObjectName = URLEncoder.encode(objectName, StandardCharsets.UTF_8.toString());
    //         return String.format("https://firebasestorage.googleapis.com/v0/b/%s/o/%s?alt=media", bucket.getName(), encodedObjectName);
    //     } catch (IllegalStateException | IOException e) {
    //         e.printStackTrace();
    //     }

    //     return objectName;
    // }

    // /**
    //  * 로컬 파일 시스템 경로(savepath)를 Firebase Storage 내부 경로로 변환함.
    //  *
    //  * 예를 들어 로컬 경로가
    //  *   /.../upload/semiproject/board/editor/
    //  * 일 때, Firebase Storage에서는
    //  *   board/editor/
    //  * 와 같이 버킷 내부 경로만 사용해야 함.
    //  *
    //  * 변환 규칙:
    //  * 1) Windows 경로 구분자 '\\'를 '/'로 통일함.
    //  * 2) 끝에 '/'가 있으면 제거하여 일관된 처리로 만듦.
    //  * 3) '/upload/semiproject/'가 포함되어 있으면 그 뒤 경로를 저장소 경로로 반환함.
    //  * 4) '/upload/'가 포함되어 있으면 그 뒤 경로를 저장소 경로로 반환함.
    //  * 5) 위 두 조건에 해당하지 않으면 마지막 '/' 이후 문자열을 폴더 이름으로 사용함.
    //  *
    //  * 반환값은 항상 폴더 경로 형태로 끝에 '/'를 붙임.
    //  */
    // private static String toStorageFolder(String savepath) {
    //     if (savepath == null || savepath.trim().isEmpty()) {
    //         return "";
    //     }

    //     // Windows 경로 구분자를 Unix 스타일로 통일
    //     String normalized = savepath.replace("\\", "/");
    //     if (normalized.endsWith("/")) {
    //         normalized = normalized.substring(0, normalized.length() - 1);
    //     }

    //     // 기본 로컬 저장 루트인 upload/semiproject 아래 경로를 추출
    //     String marker = "/upload/semiproject/";
    //     int index = normalized.indexOf(marker);
    //     if (index >= 0) {
    //         String folder = normalized.substring(index + marker.length());
    //         return folder.endsWith("/") ? folder : folder + "/";
    //     }

    //     // upload 루트 아래 경로를 추출
    //     marker = "/upload/";
    //     index = normalized.indexOf(marker);
    //     if (index >= 0) {
    //         String folder = normalized.substring(index + marker.length());
    //         return folder.endsWith("/") ? folder : folder + "/";
    //     }

    //     // 위 경우에 해당하지 않으면 마지막 폴더 이름 뒤에 '/'를 붙여서 반환
    //     index = normalized.lastIndexOf('/');
    //     if (index >= 0 && index < normalized.length() - 1) {
    //         return normalized.substring(index + 1) + "/";
    //     }

    //     return "";
    // }
}