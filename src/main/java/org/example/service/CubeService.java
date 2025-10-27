// CubeService.java
package org.example.service;

import org.example.dto.Cube;
import org.example.dto.Position;
import org.example.repository.CubeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CubeService {

    private final CubeRepository cubeRepository;
    private final MapDataService mapDataService;  // 注入MapDataService

    @Autowired
    public CubeService(CubeRepository cubeRepository, MapDataService mapDataService) {  // 修改构造函数
        this.cubeRepository = cubeRepository;
        this.mapDataService = mapDataService;  // 初始化
    }

    // 根据用户名获取用户的cube配置
    public Cube getCubeByUsername(String username) {
        return cubeRepository.findByUsername(username)
                .orElseGet(() -> createDefaultCubeForUser(username));
    }

    // 为新用户创建默认cube配置
    private Cube createDefaultCubeForUser(String username) {
        Position cubePosition = new Position(0, 5, 0);
        Position cameraPosition = new Position(0, 35, 50);
        Cube cube = new Cube(cubePosition, cameraPosition, "#FFFFFF", 10);
        cube.setUsername(username);
        return cubeRepository.save(cube);
    }

    // 保存或更新用户的cube配置，并通过MapDataService更新地图数据
    public Cube saveUserCube(Cube updatedCube) {
        String username = updatedCube.getUsername();
        if (username == null || username.isEmpty()) {
            throw new IllegalArgumentException("用户名不能为空");
        }

        // 1. 先查询该用户是否已有Cube记录
        Cube savedCube = cubeRepository.findByUsername(username)
                .map(existingCube -> {
                    // 2. 若存在，更新字段
                    existingCube.setPosition(updatedCube.getPosition());
                    existingCube.setCameraPosition(updatedCube.getCameraPosition());
                    existingCube.setColor(updatedCube.getColor());
                    existingCube.setSize(updatedCube.getSize());
                    existingCube.setRenderOrder(updatedCube.getRenderOrder()); // 更新渲染顺序
                    return cubeRepository.save(existingCube);
                })
                .orElseGet(() -> {
                    // 3. 若不存在，直接创建新记录
                    Cube newCube = createDefaultCubeForUser(username);
                    newCube.setRenderOrder(0); // 设置默认渲染顺序
                    return newCube;
                });

        // 通过MapDataService更新地图数据
        mapDataService.updateMapData(savedCube);

        return savedCube;
    }

    public Cube saveUserTime(Cube updatedCube) {
        String username = updatedCube.getUsername();
        if (username == null || username.isEmpty()) {
            throw new IllegalArgumentException("用户名不能为空");
        }

        // 1. 先查询该用户是否已有Cube记录
        Cube savedCube = cubeRepository.findByUsername(username)
                .map(existingCube -> {
                    // 2. 若存在，更新字段
                    existingCube.setTotalGameSeconds(updatedCube.getTotalGameSeconds());
                    existingCube.setRemainingSeconds(updatedCube.getRemainingSeconds());
                    existingCube.setTimeExpired(updatedCube.isTimeExpired()); // 更新是否过期
                    existingCube.setPaused(updatedCube.isPaused());
                    return cubeRepository.save(existingCube);
                })
                .orElseGet(() -> {
                    // 3. 若不存在，直接创建新记录
                    Cube newCube = createDefaultCubeForUser(username);
                    newCube.setRenderOrder(0); // 设置默认渲染顺序
                    return newCube;
                });

        // 通过MapDataService更新地图数据
        mapDataService.updateMapData(savedCube);

        return savedCube;
    }

    public boolean existsByUsername(String username) {
        // 先检查用户是否存在cube记录
        if (!cubeRepository.existsByUsername(username)) {
            return false;
        }

        // 获取用户的cube信息
        Cube cube = cubeRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户cube记录不存在"));

        // 当mapdata无数据且时间未变化时返回false，其他情况返回true
        return cube.getRemainingSeconds() != cube.getTotalGameSeconds();
    }

    public List<Cube> findAllActiveGames() {
        return cubeRepository.findAllByisPaused(false);
    }
}