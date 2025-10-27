package org.example.dto;

import javax.persistence.Embeddable;

@Embeddable
public class Position {
    private double x;
    private double y;
    private double z;

    // 保持原有构造函数和getter/setter
    public Position() {
        this.x = 0.0;
        this.y = 0.0;
        this.z = 0.0;
    }

    public Position(double x, double y, double z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // Getters and Setters
    public double getX() { return x; }
    public void setX(double x) { this.x = x; }
    public double getY() { return y; }
    public void setY(double y) { this.y = y; }
    public double getZ() { return z; }
    public void setZ(double z) { this.z = z; }
}