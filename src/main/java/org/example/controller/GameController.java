package org.example.controller;

import org.example.dto.Cube;
import org.example.dto.MapData;
import org.example.dto.PropCube;
import org.example.service.*;
import org.example.utils.JwtTokenUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
public class GameController {

    private final CubeService cubeService;
    private final JwtTokenUtil jwtTokenUtil;
    private final MapDataService mapDataService;
    private final DataCleanupService dataCleanupService;
    private final PropCubeService propCubeService;
    private final GameTimeService gameTimeService;
    private final UserService userService;

    @Autowired
    public GameController(CubeService cubeService, JwtTokenUtil jwtTokenUtil,
                          MapDataService mapDataService, DataCleanupService dataCleanupService,
                          PropCubeService propCubeService, GameTimeService gameTimeService, UserService userService) {
        this.cubeService = cubeService;
        this.jwtTokenUtil = jwtTokenUtil;
        this.mapDataService = mapDataService;
        this.dataCleanupService = dataCleanupService;
        this.propCubeService = propCubeService;
        this.gameTimeService = gameTimeService;
        this.userService = userService;
    }

    @GetMapping("/")
    public String index(Model model, HttpSession session) {
        boolean isLoggedIn = session.getAttribute("loggedInUser") != null;
        model.addAttribute("isLoggedIn", isLoggedIn);

        // 判断是否有游戏存档
        boolean hasSaveData = false;
        if (isLoggedIn) { // 仅在登录时检查存档
            String user = (String) session.getAttribute("loggedInUser");
            hasSaveData = cubeService.existsByUsername(user);
        }
        model.addAttribute("hasSaveData", hasSaveData);
        return "index"; // 无论是否登录，都直接返回首页视图
    }

    // 游戏页面访问
    @GetMapping("/game/mainGame")
    public String mainGame(Model model, HttpSession session) {
        if (session.getAttribute("loggedInUser") == null) {
            return "redirect:/";
        }
        String username = (String) session.getAttribute("loggedInUser");

        // 页面加载前先清理被覆盖的地图数据
        mapDataService.cleanUpOverlappedMapData(username);

        // 加载清理后的最新数据（后续逻辑不变）
        Cube cube = cubeService.getCubeByUsername(username);
        model.addAttribute("cube", cube);
        model.addAttribute("cameraPosition", cube.getCameraPosition());

        List<MapData> mapDataList = mapDataService.getMapDataByUsername(username);
        model.addAttribute("mapDataList", mapDataList);

        List<PropCube> userPropCubes = propCubeService.findPropCubesByUsername(username);
        model.addAttribute("userPropCubes", userPropCubes);

        model.addAttribute("remainingTime", gameTimeService.formatTime(cube.getRemainingSeconds()));

        return "game/mainGame";
    }

    // 添加API接口用于保存cube状态，需要token验证
    @PostMapping("/api/cube/save")
    @ResponseBody
    public ResponseEntity<?> saveCube(
            @RequestBody Cube cube,
            @RequestHeader(value = "Authorization", required = false) String token) {

        try {
            String username = validateToken(token);
            cube.setUsername(username);
            Cube savedCube = cubeService.saveUserCube(cube);
            propCubeService.processUserPropCubeGeneration(username, cube);
            return ResponseEntity.ok(savedCube);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            System.out.println("保存失败: " + e.getMessage());
            return ResponseEntity.ok(createErrorResponse("保存失败: " + e.getMessage()));
        }
    }

    // 重置游戏数据接口
    @PostMapping("/api/game/reset")
    @ResponseBody
    public ResponseEntity<?> resetGameData(
            @RequestParam int gameMinutes,
            @RequestHeader(value = "Authorization", required = false) String token) {

        try {
            String username = validateToken(token);
            // 调用数据清理服务重置用户数据
            dataCleanupService.deleteUserAllData(username);
            // 初始化游戏时间
            gameTimeService.initGameTime(username, gameMinutes);
            return ResponseEntity.ok().body(Collections.singletonMap("message", "游戏数据已重置"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            System.out.println("重置游戏数据失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("重置游戏数据失败: " + e.getMessage()));
        }
    }

    // 添加获取剩余时间的接口
    @GetMapping("/api/game/time")
    @ResponseBody
    public ResponseEntity<?> getRemainingTime(
            @RequestHeader(value = "Authorization", required = false) String token) {

        try {
            String username = validateToken(token);
            Cube cube = cubeService.getCubeByUsername(username);
            return ResponseEntity.ok(Collections.singletonMap(
                    "remainingTime", gameTimeService.formatTime(cube.getRemainingSeconds())
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("获取时间失败: " + e.getMessage()));
        }
    }

    // 暂停游戏计时
    @PostMapping("/api/game/pause")
    @ResponseBody
    public ResponseEntity<?> pauseGame(
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            String username = validateToken(token);
            gameTimeService.pauseGameTime(username);
            return ResponseEntity.ok(Collections.singletonMap("message", "游戏已暂停"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            System.out.println("暂停游戏失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("暂停游戏失败: " + e.getMessage()));
        }
    }

    // 继续游戏计时
    @PostMapping("/api/game/resume")
    @ResponseBody
    public ResponseEntity<?> resumeGame(
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            String username = validateToken(token);
            // 调用游戏时间服务的继续计时方法
            gameTimeService.resumeGameTime(username);
            return ResponseEntity.ok(Collections.singletonMap("message", "游戏已继续"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            System.out.println("继续游戏失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("继续游戏失败: " + e.getMessage()));
        }
    }

    /**
     * 清理用户所有游戏数据（供前端关闭时调用）
     */
    @PostMapping("/api/game/clearAllData")
    @ResponseBody
    public ResponseEntity<?> clearAllUserData(
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            // 验证token并获取用户名
            String username = validateToken(token);
            // 执行数据清理
            dataCleanupService.deleteUserAllData(username);
            return ResponseEntity.ok(Collections.singletonMap("message", "数据已全部清理"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("数据清理失败: " + e.getMessage()));
        }
    }

    // Token验证通用方法
    private String validateToken(String token) {
        // 验证token格式
        if (token == null || !token.startsWith("Bearer ")) {
            System.out.println("Token格式错误");
            throw new RuntimeException("无效的token格式");
        }

        // 提取并验证token
        String tokenValue = token.substring(7);
        String username;
        try {
            username = jwtTokenUtil.extractUsername(tokenValue);
            if (!jwtTokenUtil.validateToken(tokenValue, username) || userService.findByUsername(username) == null) {
                System.out.println("Token验证失败");
                throw new RuntimeException("token验证失败");
            }
        } catch (Exception e) {
            System.out.println("Token解析失败: " + e.getMessage());
            throw new RuntimeException("token解析失败: " + e.getMessage());
        }
        return username;
    }

    // 错误响应创建工具方法
    private Map<String, String> createErrorResponse(String message) {
        Map<String, String> error = new HashMap<>();
        error.put("error", message);
        return error;
    }
}