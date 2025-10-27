package org.example.controller;

import org.example.dto.User;
import org.example.service.CubeService;
import org.example.service.UserService;
import org.example.utils.JwtTokenUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

@Controller
public class AuthController {

    private final UserService userService;
    private final JwtTokenUtil jwtTokenUtil;
    private final CubeService cubeService;

    @Autowired
    public AuthController(UserService userService, JwtTokenUtil jwtTokenUtil, CubeService cubeService) {
        this.userService = userService;
        this.jwtTokenUtil = jwtTokenUtil;
        this.cubeService = cubeService;
    }

    // 注册逻辑 - 添加消息传递
    @PostMapping("/register")
    public String register(@RequestParam String username, @RequestParam String password, Model model) {
        boolean success = userService.registerUser(username, password);
        if (success) {
            model.addAttribute("successMessage", "注册成功，请登录");
        } else {
            model.addAttribute("errorMessage", "用户名已存在");
        }
        model.addAttribute("isLoggedIn", false);
        return "index"; // 明确返回首页视图
    }

    // 登录逻辑 - 添加消息传递
    @PostMapping("/login")
    public String login(@RequestParam String username, @RequestParam String password,
                        Model model, HttpSession session, HttpServletResponse response) {
        User user = userService.findByUsername(username);
        if (user == null || !userService.verifyPassword(password, user.getPassword())) {
            model.addAttribute("errorMessage", "用户名或密码错误");
            model.addAttribute("isLoggedIn", false);
            return "index";
        }

        // 登录成功，生成token
        String token = jwtTokenUtil.generateToken(username);

        // 存储用户信息到Session
        session.setAttribute("loggedInUser", username);
        session.setAttribute("token", token);

        // 将token添加到响应头
        response.setHeader("Authorization", "Bearer " + token);

        model.addAttribute("isLoggedIn", true);
        model.addAttribute("successMessage", "登录成功，欢迎回来！");
        model.addAttribute("token", token); // 传递给前端

        // 判断是否有游戏存档
        boolean hasSaveData = cubeService.existsByUsername(username);
        model.addAttribute("hasSaveData", hasSaveData);

        return "index";
    }

    // 登出逻辑
    @PostMapping("/logout")
    public String logout(HttpSession session, Model model) {
        session.invalidate(); // 清除所有Session数据
        model.addAttribute("isLoggedIn", false);
        model.addAttribute("successMessage", "已成功退出登录");
        return "index";
    }
}