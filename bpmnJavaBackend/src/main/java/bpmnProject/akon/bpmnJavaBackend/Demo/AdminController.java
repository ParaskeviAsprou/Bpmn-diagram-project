package bpmnProject.akon.bpmnJavaBackend.Demo;

import io.swagger.v3.oas.annotations.Hidden;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    @GetMapping
    @PreAuthorize("hasAuthority('admin:read')")
    public String get() {
        return "GET:: admin controller";
    }
    @PostMapping
    @PreAuthorize("hasAuthority('admin:create')")
    @Hidden
    public String post() {
        return "POST:: admin controller";
    }
    @PutMapping
    @PreAuthorize("hasAuthority('admin:update')")
    @Hidden
    public String put() {
        return "PUT:: admin controller";
    }
    @DeleteMapping
    @PreAuthorize("hasAuthority('admin:delete')")
    @Hidden
    public String delete() {
        return "DELETE:: admin controller";
    }


    @GetMapping("/public")
    public ResponseEntity<Map<String, String>> publicEndpoint() {
        return ResponseEntity.ok(Map.of(
                "message", "This is a public endpoint",
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }

    @GetMapping("/protected")
    public ResponseEntity<Map<String, Object>> protectedEndpoint(Principal principal) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        return ResponseEntity.ok(Map.of(
                "message", "This is a protected endpoint",
                "user", principal.getName(),
                "authorities", auth.getAuthorities(),
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> adminEndpoint(Principal principal) {
        return ResponseEntity.ok(Map.of(
                "message", "This is an admin-only endpoint",
                "user", principal.getName(),
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }

    @GetMapping("/modeler")
    @PreAuthorize("hasRole('MODELER') or hasRole('ROLE_MODELER') or hasRole('ADMIN') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> modelerEndpoint(Principal principal) {
        return ResponseEntity.ok(Map.of(
                "message", "This endpoint is for modelers and admins",
                "user", principal.getName(),
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }

    @GetMapping("/viewer")
    @PreAuthorize("hasRole('VIEWER') or hasRole('ROLE_VIEWER') or hasRole('MODELER') or hasRole('ROLE_MODELER') or hasRole('ADMIN') or hasRole('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> viewerEndpoint(Principal principal) {
        return ResponseEntity.ok(Map.of(
                "message", "This endpoint is for all authenticated users",
                "user", principal.getName(),
                "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }
}
