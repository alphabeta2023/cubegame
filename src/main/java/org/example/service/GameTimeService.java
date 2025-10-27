package org.example.service;

import org.example.dto.Cube;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GameTimeService {

    private final CubeService cubeService;

    @Autowired
    public GameTimeService(CubeService cubeService) {
        this.cubeService = cubeService;
    }

    // 初始化游戏时间
    public void initGameTime(String username, int minutes) {
        Cube cube = cubeService.getCubeByUsername(username);
        cube.setTotalGameSeconds(minutes * 60L);
        cube.setRemainingSeconds(minutes * 60L);
        cube.setTimeExpired(false);
        cubeService.saveUserCube(cube);
    }

    // 每秒更新游戏时间
    @Scheduled(fixedRate = 1000) // 每秒执行一次
    public void updateGameTime() {
        // 获取所有正在进行游戏的用户
        List<Cube> activeCubes = cubeService.findAllActiveGames();

        for (Cube cube : activeCubes) {
            if (!cube.isTimeExpired() && !cube.isPaused() && cube.getRemainingSeconds() > 0) {
                cube.setRemainingSeconds(cube.getRemainingSeconds() - 1);

                // 检查时间是否结束
                if (cube.getRemainingSeconds() <= 0) {
                    cube.setTimeExpired(true);
                }

                cubeService.saveUserTime(cube);
            }
        }
    }

    // 格式化时间显示
    public String formatTime(long seconds) {
        long minutes = seconds / 60;
        long secs = seconds % 60;
        return String.format("%02d:%02d", minutes, secs);
    }

    public void pauseGameTime(String username) {
        Cube cube = cubeService.getCubeByUsername(username);
        cube.setPaused(true);
        cubeService.saveUserTime(cube);
    }

    public void resumeGameTime(String username) {
        Cube cube = cubeService.getCubeByUsername(username);
        cube.setPaused(false);
        cubeService.saveUserTime(cube);
    }
}
