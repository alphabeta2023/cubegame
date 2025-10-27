package org.example.service;

import org.example.dto.Cube;
import org.example.dto.Position;
import org.example.dto.PropCube;
import org.example.repository.PropCubeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PropCubeService {

    private final PropCubeRepository propCubeRepository;

    // 存储每个用户的随机间隔时间(10-30秒)和上次生成时间
    private final Map<String, Integer> userIntervals = new HashMap<>();
    private final Map<String, Long> lastGenerateTimes = new HashMap<>();

    @Autowired
    public PropCubeService(PropCubeRepository propCubeRepository) {
        this.propCubeRepository = propCubeRepository;
    }

    /**
     * 添加新的PropCube
     * @param propCube 道具立方体对象（不含index，由系统计算）
     * @return 保存后的PropCube
     */
    public PropCube addPropCube(PropCube propCube) {
        // 参数校验
        validatePropCube(propCube);

        try {
            return propCubeRepository.save(propCube);
        } catch (DataIntegrityViolationException e) {
            throw new IllegalArgumentException("索引已存在，无法添加");
        }
    }

    /**
     * 根据索引删除PropCube（带权限校验）
     * @param index 要删除的索引
     * @param username 操作的用户名
     * @return 是否删除成功
     */
    public boolean deletePropCubeByIndex(int index, String username) {
        // 校验索引范围
        if (index < 1 || index > 4) {
            throw new IllegalArgumentException("索引必须为1-4之间的整数");
        }

        // 查找并删除指定索引且属于该用户的记录
        return propCubeRepository.findByIndexAndUsername(index, username)
                .map(propCube -> {
                    propCubeRepository.delete(propCube);
                    return true;
                })
                .orElseThrow(() -> new IllegalArgumentException("索引不存在或无权限删除"));
    }

    /**
     * 参数合法性校验
     */
    private void validatePropCube(PropCube cube) {
        if (cube.getPosition() == null) {
            throw new IllegalArgumentException("位置参数不能为空");
        }

        Position pos = cube.getPosition();
        if (pos.getX() == 0 || pos.getZ() == 0) {
            throw new IllegalArgumentException("x和z坐标不能为0（不能在坐标轴上）");
        }

        if (cube.getColor() == null || cube.getColor().trim().isEmpty()) {
            throw new IllegalArgumentException("颜色参数不能为空");
        }

        if (cube.getSize() <= 0) {
            throw new IllegalArgumentException("尺寸必须大于0");
        }

        if (cube.getRotationSpeed() <= 0) {
            throw new IllegalArgumentException("自旋速度必须大于0");
        }

        if (cube.getUsername() == null || cube.getUsername().trim().isEmpty()) {
            throw new IllegalArgumentException("用户名不能为空");
        }
    }

    /**
     * 处理指定用户的PropCube生成逻辑
     */
    public void processUserPropCubeGeneration(String username, Cube cube) {
        // 为用户初始化随机间隔时间(10-30秒)
        if (!userIntervals.containsKey(username)) {
            userIntervals.put(username, generateRandomInterval());
            lastGenerateTimes.put(username, System.currentTimeMillis());
            return;
        }

        // 获取用户的间隔时间并检查是否到达生成时间
        int interval = userIntervals.get(username);
        long currentTime = System.currentTimeMillis();
        long lastTime = lastGenerateTimes.get(username);

        if (currentTime - lastTime >= interval * 1000L) {
            // 计算用户当前所在象限
            int userQuadrant = calculateUserQuadrant(cube.getPosition());

            // 生成新道具
            generateAndSavePropCube(username, userQuadrant, cube.getSize());
            // 重置间隔时间和上次生成时间
            userIntervals.put(username, generateRandomInterval());
            lastGenerateTimes.put(username, currentTime);
        }
    }

    private int calculateUserQuadrant(Position position) {
        double x = position.getX();
        double z = position.getZ();

        if (x >= 0 && z >= 0) {
            return 1;
        } else if (x < 0 && z > 0) {
            return 2;
        } else if (x < 0 && z < 0) {
            return 3;
        } else {
            return 4;
        }
    }

    private void generateAndSavePropCube(String username, int userQuadrant, double cubeSize) {
        // 获取所有不是用户所在的象限
        List<Integer> otherQuadrants = new ArrayList<>();
        for (int i = 1; i <= 4; i++) {
            if (i != userQuadrant) {
                otherQuadrants.add(i);
            }
        }

        // 过滤出没有PropCube的象限
        List<Integer> availableQuadrants = otherQuadrants.stream()
                .filter(q -> !propCubeRepository.existsByIndex(q))
                .collect(Collectors.toList());

        if (availableQuadrants.isEmpty()) {
            return; // 没有可用象限，不生成
        }

        // 随机选择一个可用象限
        int targetQuadrant = availableQuadrants.get(
                new Random().nextInt(availableQuadrants.size())
        );

        // 生成随机位置
        Position propPosition = generateRandomPosition(targetQuadrant);
        propPosition.setY(cubeSize / 2.0);

        // 生成随机颜色
        String color = generateRandomColor();

        // 生成随机旋转速度
        double rotationSpeed = generateRandomRotationSpeed();

        // 创建并保存PropCube
        PropCube propCube = new PropCube(
                propPosition,
                color,
                cubeSize/2.0,
                rotationSpeed,
                username
        );
        propCube.setIndex(targetQuadrant); // 设置象限索引

        propCubeRepository.save(propCube);

        PropCubeWebSocketHandler.broadcastPropCube(propCube);
    }

    private Position generateRandomPosition(int quadrant) {
        Random random = new Random();
        // 生成50-480之间的随机数
        int xAbs = 50 + random.nextInt(431);
        int zAbs = 50 + random.nextInt(431);

        // 根据象限确定符号
        int xSign = (quadrant == 1 || quadrant == 4) ? 1 : -1;
        int zSign = (quadrant == 1 || quadrant == 2) ? 1 : -1;

        Position position = new Position();
        position.setX(xSign * xAbs);
        position.setZ(zSign * zAbs);

        return position;
    }

    private String generateRandomColor() {
        Random random = new Random();
        // 生成0x000000到0xFFFFFF之间的随机颜色
        int colorValue = random.nextInt(0xFFFFFF + 1);
        // 转换为十六进制字符串，确保6位长度
        return String.format("#%06X", colorValue);
    }

    private double generateRandomRotationSpeed() {
        Random random = new Random();
        // 50%概率生成负速度(-3到-0.5)，50%概率生成正速度(0.5到3)
        if (random.nextBoolean()) {
            // 负速度
            return -3 + random.nextDouble() * 2.5;
        } else {
            // 正速度
            return 0.5 + random.nextDouble() * 2.5;
        }
    }

    private int generateRandomInterval() {
        return 10 + new Random().nextInt(21); // 10-30秒
    }

    /**
     * 根据用户名查询其所有道具Cube
     * @param username 用户名
     * @return 该用户的所有道具Cube列表
     */
    public List<PropCube> findPropCubesByUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("用户名不能为空");
        }
        return propCubeRepository.findByUsername(username);
    }

    /**
     * 根据ID删除道具立方体
     * @param id 道具ID
     * @return 是否删除成功
     */
    public boolean deletePropCubeById(Long id) {
        if (id == null) {
            throw new IllegalArgumentException("道具ID不能为空");
        }

        if (propCubeRepository.existsById(id)) {
            propCubeRepository.deleteById(id);
            return true;
        }
        return false;
    }
}