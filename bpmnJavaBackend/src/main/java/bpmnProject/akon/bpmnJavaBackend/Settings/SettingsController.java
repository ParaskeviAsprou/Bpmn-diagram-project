package bpmnProject.akon.bpmnJavaBackend.Settings;

import bpmnProject.akon.bpmnJavaBackend.DtoClasses.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class SettingsController {

    private final SettingsService settingsService;

    // Current user endpoints (existing)
    @GetMapping("/user")
    public ResponseEntity<UserSettingsDto> getUserSettings(Principal connectedUser) {
        UserSettingsDto settings = settingsService.getUserSettings(connectedUser);
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDto> updateProfile(
            @RequestBody UserDto userDto,
            Principal connectedUser
    ) {
        UserDto updatedUser = settingsService.updateProfile(userDto, connectedUser);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/preferences")
    @PreAuthorize("hasAnyRole('ROLE_MODELER', 'ROLE_ADMIN')")
    public ResponseEntity<PreferencesDto> updatePreferences(
            @RequestBody PreferencesDto preferencesDto,
            Principal connectedUser
    ) {
        PreferencesDto updatedPreferences = settingsService.updatePreferences(preferencesDto, connectedUser);
        return ResponseEntity.ok(updatedPreferences);
    }

    @PutMapping("/security")
    public ResponseEntity<SecuritySettingsDto> updateSecurity(
            @RequestBody SecuritySettingsDto securityDto,
            Principal connectedUser
    ) {
        SecuritySettingsDto updatedSecurity = settingsService.updateSecurity(securityDto, connectedUser);
        return ResponseEntity.ok(updatedSecurity);
    }

    @PutMapping("/password")
    public ResponseEntity<?> changePassword(
            @RequestBody ChangePasswordDto passwordDto,
            Principal connectedUser
    ) {
        settingsService.changePassword(passwordDto, connectedUser);
        return ResponseEntity.ok().build();
    }

    // Admin endpoints for managing other users
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<UserSettingsDto> getUserSettingsById(
            @PathVariable Integer userId,
            Principal connectedUser
    ) {
        UserSettingsDto settings = settingsService.getUserSettingsById(userId, connectedUser);
        return ResponseEntity.ok(settings);
    }

    @PutMapping("/user/{userId}/profile")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<UserDto> updateUserProfile(
            @PathVariable Integer userId,
            @RequestBody UserDto userDto,
            Principal connectedUser
    ) {
        UserDto updatedUser = settingsService.updateUserProfile(userId, userDto, connectedUser);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/user/{userId}/preferences")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<PreferencesDto> updateUserPreferences(
            @PathVariable Integer userId,
            @RequestBody PreferencesDto preferencesDto,
            Principal connectedUser
    ) {
        PreferencesDto updatedPreferences = settingsService.updateUserPreferences(userId, preferencesDto, connectedUser);
        return ResponseEntity.ok(updatedPreferences);
    }

    @PutMapping("/user/{userId}/security")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<SecuritySettingsDto> updateUserSecurity(
            @PathVariable Integer userId,
            @RequestBody SecuritySettingsDto securityDto,
            Principal connectedUser
    ) {
        SecuritySettingsDto updatedSecurity = settingsService.updateUserSecurity(userId, securityDto, connectedUser);
        return ResponseEntity.ok(updatedSecurity);
    }

    // Admin endpoint to get all users for selection
    @GetMapping("/users")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        List<UserDto> users = settingsService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    // Admin endpoint to get users by role
    @GetMapping("/users/role/{roleName}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<UserDto>> getUsersByRole(@PathVariable String roleName) {
        List<UserDto> users = settingsService.getUsersByRole(roleName);
        return ResponseEntity.ok(users);
    }

    // Admin endpoint to get modelers and viewers (excluding admins)
    @GetMapping("/users/manageable")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public ResponseEntity<List<UserDto>> getManageableUsers() {
        List<UserDto> users = settingsService.getManageableUsers();
        return ResponseEntity.ok(users);
    }
}