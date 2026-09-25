import prisma from '../src/prisma/client.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

async function createTestAdmin() {
  try {
    const email = 'test@example.com';
    const password = 'test123';
    
    // Check if admin already exists
    const existing = await prisma.admin.findUnique({
      where: { email }
    });
    
    if (existing) {
      console.log('Admin already exists');
      const token = jwt.sign(
        { id: existing.id, email: existing.email, role: existing.role },
        process.env.JWT_SECRET || 'help_center_super_secret_key_2026',
        { expiresIn: '7d' }
      );
      console.log('Token:', token);
      return;
    }
    
    // Create admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Test Admin',
        role: 'super_admin'
      }
    });
    
    console.log('Admin created:', admin.email);
    
    // Generate token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'help_center_super_secret_key_2026',
      { expiresIn: '7d' }
    );
    
    console.log('Token:', token);
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestAdmin();
