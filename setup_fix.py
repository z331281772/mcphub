#!/usr/bin/env python3
"""
项目环境修复脚本
自动检测和修复项目中的常见问题
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

class ProjectFixer:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.python_version = sys.version_info
        
    def check_python(self):
        """检查Python环境"""
        print("��� 检查Python环境...")
        print(f"Python版本: {self.python_version.major}.{self.python_version.minor}.{self.python_version.micro}")
        
        if self.python_version < (3, 8):
            print("❌ Python版本过低，需要3.8或更高版本")
            return False
        else:
            print("✅ Python版本符合要求")
            return True
    
    def check_dependencies(self):
        """检查依赖包"""
        print("��� 检查依赖包...")
        requirements_file = self.project_root / "requirements.txt"
        
        if not requirements_file.exists():
            print("❌ requirements.txt文件不存在")
            return False
            
        try:
            with open(requirements_file, 'r') as f:
                requirements = [line.strip() for line in f if line.strip() and not line.startswith('#')]
            
            missing_packages = []
            for req in requirements:
                package = req.split('>=')[0].split('<')[0]
                try:
                    __import__(package)
                except ImportError:
                    missing_packages.append(package)
            
            if missing_packages:
                print(f"❌ 缺少依赖包: {missing_packages}")
                return missing_packages
            else:
                print("✅ 所有依赖包已安装")
                return []
                
        except Exception as e:
            print(f"❌ 检查依赖时出错: {e}")
            return None
    
    def install_dependencies(self, packages=None):
        """安装依赖包"""
        print("��� 安装依赖包...")
        try:
            if packages:
                for package in packages:
                    subprocess.run([sys.executable, '-m', 'pip', 'install', package], check=True)
            else:
                subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], check=True)
            print("✅ 依赖包安装完成")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ 安装依赖失败: {e}")
            return False
    
    def check_directories(self):
        """检查必要的目录结构"""
        print("��� 检查目录结构...")
        required_dirs = [
            'data/input',
            'data/output',
            'logs',
            'config'
        ]
        
        missing_dirs = []
        for dir_path in required_dirs:
            full_path = self.project_root / dir_path
            if not full_path.exists():
                missing_dirs.append(dir_path)
                full_path.mkdir(parents=True, exist_ok=True)
                print(f"��� 创建目录: {dir_path}")
        
        if missing_dirs:
            print(f"✅ 已创建缺失目录: {missing_dirs}")
        else:
            print("✅ 所有目录已存在")
        
        return True
    
    def check_config_files(self):
        """检查配置文件"""
        print("��� 检查配置文件...")
        config_file = self.project_root / "config" / "config.yaml"
        env_example = self.project_root / "env_example.txt"
        
        if not config_file.exists():
            print("❌ config.yaml文件不存在")
            return False
        
        if not env_example.exists():
            print("❌ env_example.txt文件不存在")
            return False
            
        print("✅ 配置文件存在")
        return True
    
    def create_sample_data(self):
        """创建示例数据文件"""
        print("��� 创建示例数据...")
        sample_data_dir = self.project_root / "data" / "input"
        sample_file = sample_data_dir / "sample_strategy_views.xlsx"
        
        if not sample_file.exists():
            try:
                import pandas as pd
                
                # 创建示例数据
                current_data = pd.DataFrame({
                    '券商': ['券商A', '券商B', '券商C'],
                    '题目': ['本周策略', '市场分析', '投资建议'],
                    '主要观点': ['市场看涨', '谨慎乐观', '结构性机会'],
                    '配置方向': ['科技、消费', '金融、地产', '新能源、医药']
                })
                
                previous_data = pd.DataFrame({
                    '券商': ['券商A', '券商B', '券商C'],
                    '题目': ['上周策略', '市场回顾', '投资展望'],
                    '主要观点': ['市场震荡', '中性偏谨慎', '均衡配置'],
                    '配置方向': ['消费、医药', '科技、金融', '周期、消费']
                })
                
                with pd.ExcelWriter(sample_file, engine='openpyxl') as writer:
                    current_data.to_excel(writer, sheet_name='本周数据', index=False)
                    previous_data.to_excel(writer, sheet_name='上周数据', index=False)
                
                print("✅ 示例数据文件已创建")
                return True
                
            except Exception as e:
                print(f"❌ 创建示例数据失败: {e}")
                return False
        else:
            print("✅ 示例数据文件已存在")
            return True
    
    def run_all_checks(self):
        """运行所有检查"""
        print("��� 开始项目诊断和修复...")
        print("=" * 50)
        
        # 检查Python环境
        python_ok = self.check_python()
        
        # 检查依赖
        missing_deps = self.check_dependencies()
        
        # 安装缺失的依赖
        if missing_deps:
            install_ok = self.install_dependencies(missing_deps if isinstance(missing_deps, list) else None)
        else:
            install_ok = True
        
        # 检查目录结构
        dirs_ok = self.check_directories()
        
        # 检查配置文件
        config_ok = self.check_config_files()
        
        # 创建示例数据
        sample_ok = self.create_sample_data()
        
        print("=" * 50)
        print("��� 诊断结果:")
        print(f"Python环境: {'✅' if python_ok else '❌'}")
        print(f"依赖安装: {'✅' if install_ok else '❌'}")
        print(f"目录结构: {'✅' if dirs_ok else '❌'}")
        print(f"配置文件: {'✅' if config_ok else '❌'}")
        print(f"示例数据: {'✅' if sample_ok else '❌'}")
        
        all_ok = all([python_ok, install_ok, dirs_ok, config_ok, sample_ok])
        
        if all_ok:
            print("\n��� 项目环境配置完成！")
            print("\n下一步:")
            print("1. 复制 env_example.txt 为 .env")
            print("2. 在 .env 文件中设置实际的API token")
            print("3. 运行: python main.py --input data/input/sample_strategy_views.xlsx")
        else:
            print("\n⚠️  请修复上述问题后再运行项目")
        
        return all_ok

if __name__ == "__main__":
    fixer = ProjectFixer()
    fixer.run_all_checks()
