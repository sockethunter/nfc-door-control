/*
 * Copyright (c) 2025 sockethunter
 *
 * This file is part of nfc-door-control 
 * (see https://github.com/sockethunter/nfc-door-control).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

function askPassword(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (password) => {
      resolve(password);
    });
  });
}

async function main() {
  console.log('🌱 NFC Door Control - Database Seeding');
  console.log('=====================================\n');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' }
  });

  if (existingAdmin) {
    console.log('ℹ️  Admin user already exists!');
    const overwrite = await askQuestion('Do you want to overwrite the admin user? (y/N): ');
    
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('❌ Canceled. Use the existing admin user.');
      rl.close();
      return;
    }
    
    // Delete existing admin
    await prisma.user.delete({ where: { username: 'admin' } });
    console.log('🗑️  Existing admin user deleted.');
  }

  // Ask for password
  console.log('🔐 Creating new admin user...');
  const username = await askQuestion('Username (default: admin): ') || 'admin';
  
  let password: string;
  let confirmPassword: string;
  
  do {
    password = await askQuestion('Password: ');
    if (!password.trim()) {
      console.log('❌ Password cannot be empty!');
      continue;
    }
    
    confirmPassword = await askQuestion('Confirm password: ');
    
    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match! Try again.\n');
    }
  } while (password !== confirmPassword || !password.trim());

  // Hash password and create user
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash: hashedPassword,
      role: 'admin',
    },
  });

  console.log('\n✅ Admin user created successfully!');
  console.log(`👤 Username: ${user.username}`);
  console.log(`🔑 Role: ${user.role}`);
  console.log(`📅 Created: ${user.createdAt.toLocaleString()}`);

  console.log('\n🎉 Setup completed!');
  console.log('\nYou can now login with:');
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${password}`);
  console.log('\nStart the application with: npm run dev');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    rl.close();
    process.exit(0);
  });