#!/bin/bash

# Building Plan Approval System Startup Script
# This script sets up and runs the complete application

echo "🏗️  Building Plan Approval System"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads
mkdir -p outputs
mkdir -p backend/uploads
mkdir -p backend/outputs

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env .env.backup 2>/dev/null || true
fi

echo "🔧 Environment Setup:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend API: http://localhost:8000"
echo "   - API Docs: http://localhost:8000/docs"
echo "   - Database: PostgreSQL on port 5432"

# Option 1: Run with Docker Compose (Recommended)
echo ""
echo "Choose installation method:"
echo "1) Docker Compose (Recommended - Full stack)"
echo "2) Local Development (Backend + Frontend separately)"
echo "3) Backend only (API development)"
echo "4) Frontend only (UI development)"
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        echo "🐳 Starting with Docker Compose..."
        docker-compose down 2>/dev/null || true
        docker-compose up --build -d
        
        echo "⏳ Waiting for services to start..."
        sleep 10
        
        # Check if services are running
        if docker-compose ps | grep -q "Up"; then
            echo "✅ Services started successfully!"
            echo ""
            echo "🌐 Access the application:"
            echo "   Frontend: http://localhost:3000"
            echo "   Backend API: http://localhost:8000"
            echo "   API Documentation: http://localhost:8000/docs"
            echo ""
            echo "📊 To view logs: docker-compose logs -f"
            echo "🛑 To stop: docker-compose down"
        else
            echo "❌ Failed to start services. Check logs with: docker-compose logs"
        fi
        ;;
        
    2)
        echo "💻 Setting up local development environment..."
        
        # Backend setup
        echo "🐍 Setting up Python backend..."
        cd backend
        if [ ! -d "venv" ]; then
            python3 -m venv venv
        fi
        source venv/bin/activate
        pip install -r ../requirements.txt
        
        # Start backend in background
        echo "🚀 Starting backend server..."
        uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
        BACKEND_PID=$!
        cd ..
        
        # Frontend setup
        echo "⚛️  Setting up React frontend..."
        if [ ! -d "node_modules" ]; then
            npm install
        fi
        
        echo "🚀 Starting frontend server..."
        npm start &
        FRONTEND_PID=$!
        
        echo "✅ Development servers started!"
        echo "   Backend PID: $BACKEND_PID"
        echo "   Frontend PID: $FRONTEND_PID"
        echo "   Frontend: http://localhost:3000"
        echo "   Backend: http://localhost:8000"
        
        # Wait for Ctrl+C
        trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit" INT
        wait
        ;;
        
    3)
        echo "🐍 Starting backend only..."
        cd backend
        if [ ! -d "venv" ]; then
            python3 -m venv venv
        fi
        source venv/bin/activate
        pip install -r ../requirements.txt
        uvicorn main:app --reload --host 0.0.0.0 --port 8000
        ;;
        
    4)
        echo "⚛️  Starting frontend only..."
        if [ ! -d "node_modules" ]; then
            npm install
        fi
        npm start
        ;;
        
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac