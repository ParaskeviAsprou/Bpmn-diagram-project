package bpmnProject.akon.bpmnJavaBackend.Auth;

import bpmnProject.akon.bpmnJavaBackend.User.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "http://localhost:4200")
public class AuthenticationController {

    private final AuthenticationService service;

    @Autowired
    public AuthenticationController(AuthenticationService service) {
        this.service = service;
    }

    @PostMapping(value = "/login", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<AuthenticationResponse> login(@RequestBody LoginRequest request) {
        try {
            System.out.println("Login attempt for user: " + request.getUsername());
            AuthenticationResponse response = service.authenticate(request);
            System.out.println("Login successful for user: " + request.getUsername());
            return ResponseEntity.ok(response);
        } catch (LockedException e) {
            System.err.println("Account locked for user: " + request.getUsername() + " - " + e.getMessage());
            return ResponseEntity.status(HttpStatus.LOCKED)
                    .body(AuthenticationResponse.builder()
                            .tokenType("error")
                            .build());
        } catch (DisabledException e) {
            System.err.println("Account disabled for user: " + request.getUsername() + " - " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthenticationResponse.builder()
                            .tokenType("error")
                            .build());
        } catch (BadCredentialsException e) {
            System.err.println("Bad credentials for user: " + request.getUsername() + " - " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthenticationResponse.builder()
                            .tokenType("error")
                            .build());
        } catch (Exception e) {
            System.err.println("Login error for user: " + request.getUsername() + " - " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(AuthenticationResponse.builder()
                            .tokenType("error")
                            .build());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(@RequestBody RegisterRequest request) {
        try {
            System.out.println("Registration attempt for user: " + request.getUsername());
            AuthenticationResponse response = service.register(request);
            System.out.println("Registration successful for user: " + request.getUsername());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Registration error for user: " + request.getUsername() + " - " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(AuthenticationResponse.builder()
                            .tokenType("error")
                            .build());
        }
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<AuthenticationResponse> refreshToken(@RequestBody RefreshTokenRequest request) {
        try {
            AuthenticationResponse response = service.refreshToken(request.getRefreshToken());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Refresh token error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(AuthenticationResponse.builder()
                            .tokenType("error")
                            .build());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String jwt = authHeader.substring(7);
                service.logout(jwt);
            }
            return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Logout failed"));
        }
    }

    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateToken(HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String jwt = authHeader.substring(7);
                boolean isValid = service.validateToken(jwt);
                return ResponseEntity.ok(Map.of("valid", isValid));
            }
            return ResponseEntity.ok(Map.of("valid", false));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("valid", false));
        }
    }
}