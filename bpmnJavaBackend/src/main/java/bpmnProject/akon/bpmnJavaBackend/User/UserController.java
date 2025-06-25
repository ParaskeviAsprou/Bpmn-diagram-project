package bpmnProject.akon.bpmnJavaBackend.User;

import bpmnProject.akon.bpmnJavaBackend.DtoClasses.*;
import bpmnProject.akon.bpmnJavaBackend.Settings.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final SettingsService settingsService;

    @PatchMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody ChangePasswordRequest request,
            Principal connectedUser
    ) {
        userService.changePassword(request, connectedUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(Principal connectedUser) {
        UserDto user = userService.getCurrentUser(connectedUser);
        return ResponseEntity.ok(user);
    }

    @GetMapping
    public ResponseEntity<List<UserDto>> getAllUsers() {
        List<UserDto> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserDto> getUserById(@PathVariable Integer userId) {
        UserDto user = userService.getUserById(userId);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/{userId}/roles")
    public ResponseEntity<UserDto> updateUserRoles(
            @PathVariable Integer userId,
            @RequestBody Set<String> roleNames
    ) {
        UserDto updatedUser = userService.updateUserRoles(userId, roleNames);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable Integer userId) {
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/roles")
    public ResponseEntity<List<RoleDto>> getAllRoles() {
        List<RoleDto> roles = userService.getAllRoles();
        return ResponseEntity.ok(roles);
    }

    @PostMapping("/assign-role")
    public ResponseEntity<UserDto> assignRoleToUser(
            @RequestParam Integer userId,
            @RequestParam String roleName
    ) {
        UserDto updatedUser = userService.assignRoleToUser(userId, roleName);
        return ResponseEntity.ok(updatedUser);
    }

    @DeleteMapping("/{userId}/roles/{roleName}")
    public ResponseEntity<UserDto> removeRoleFromUser(
            @PathVariable Integer userId,
            @PathVariable String roleName
    ) {
        UserDto updatedUser = userService.removeRoleFromUser(userId, roleName);
        return ResponseEntity.ok(updatedUser);
    }


}