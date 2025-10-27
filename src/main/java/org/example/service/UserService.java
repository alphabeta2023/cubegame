package org.example.service;

import org.example.dto.User;
import org.example.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class UserService {
    private final UserRepository userRepository;

    // 用于生成随机盐值的工具
    private final SecureRandom secureRandom = new SecureRandom();
    // 使用SHA-256哈希算法
    private static final String HASH_ALGORITHM = "SHA-256";
    // 盐值长度
    private static final int SALT_LENGTH = 16;

    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // 生成随机盐值
    private String generateSalt() {
        byte[] salt = new byte[SALT_LENGTH];
        secureRandom.nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }

    // 自定义加密方法：盐值 + 哈希
    private String encryptPassword(String rawPassword, String salt) {
        try {
            MessageDigest messageDigest = MessageDigest.getInstance(HASH_ALGORITHM);
            // 将盐值加入摘要计算
            messageDigest.update(Base64.getDecoder().decode(salt));
            // 加入密码并计算哈希
            byte[] hashedBytes = messageDigest.digest(rawPassword.getBytes());
            // 返回Base64编码的哈希值
            return Base64.getEncoder().encodeToString(hashedBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("加密算法不存在: " + HASH_ALGORITHM, e);
        }
    }

    // 用户注册（使用自定义加密器加密密码）
    public boolean registerUser(String username, String password) {
        if (userRepository.existsByUsername(username)) {
            return false; // 用户名已存在
        }

        // 生成盐值
        String salt = generateSalt();
        // 加密密码
        String encryptedPassword = encryptPassword(password, salt);
        // 存储格式: 盐值:加密后的密码
        String storedPassword = salt + ":" + encryptedPassword;

        User user = new User(username, storedPassword);
        userRepository.save(user);
        return true;
    }

    // 根据用户名查询用户
    public User findByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }

    // 验证密码
    public boolean verifyPassword(String rawPassword, String storedPassword) {
        // 从存储的字符串中分离盐值和加密后的密码
        String[] parts = storedPassword.split(":", 2);
        if (parts.length != 2) {
            return false; // 格式错误
        }

        String salt = parts[0];
        String encryptedPassword = parts[1];

        // 使用相同的盐值和密码计算哈希并比对
        String verificationHash = encryptPassword(rawPassword, salt);
        return verificationHash.equals(encryptedPassword);
    }
}
