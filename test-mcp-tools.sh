#!/bin/bash

# MCP Template Tools Testing Script
# Tests all tools via HTTP transport using curl
# Usage: ./test-mcp-tools.sh [port]

set -e

# Check for options first
SKIP_ANIMATION=false
if [ "$1" = "--fast" ] || [ "$1" = "-f" ]; then
    SKIP_ANIMATION=true
    shift
fi

# Configuration
PORT=${1:-3000}
BASE_URL="http://localhost:${PORT}"
MCP_ENDPOINT="${BASE_URL}/mcp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counter for tests
TOTAL_TESTS=0
PASSED_TESTS=0

# Loading animation variables
SPINNER_PID=""
ASCII_ART_PID=""
SPINNER_CHARS="⣾⣽⣻⢿⡿⣟⣯⣷"
# Rainbow color codes
RAINBOW_COLORS=(
    "\033[38;5;196m"  # Red
    "\033[38;5;208m"  # Orange  
    "\033[38;5;226m"  # Yellow
    "\033[38;5;46m"   # Green
    "\033[38;5;51m"   # Cyan
    "\033[38;5;21m"   # Blue
    "\033[38;5;129m"  # Purple
    "\033[38;5;201m"  # Magenta
)

# ASCII art lines
ASCII_LINES=(
    "██╗   ██╗   ██████╗██████╗     ████████╗███████╗███████╗████████╗"
    "████╗ ████╗██╔════╝██╔══██╗    ╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝"
    "██╔████╔██║██║     ██████╔╝       ██║   █████╗  ███████╗   ██║   "
    "██║╚██╔╝██║██║     ██╔═══╝        ██║   ██╔══╝  ╚════██║   ██║   "
    "██║ ╚═╝ ██║╚██████╗██║            ██║   ███████╗███████║   ██║   "
    "╚═╝     ╚═╝ ╚═════╝╚═╝            ╚═╝   ╚══════╝╚══════╝   ╚═╝   "
)

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_test() {
    # Only increment counter, don't print test name unless it fails
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

print_success() {
    # Only increment counter, don't print success messages
    PASSED_TESTS=$((PASSED_TESTS + 1))
}

print_error() {
    stop_spinner
    echo -e "\n${RED}❌ FAILED: $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Function to start loading spinner
start_spinner() {
    local message="$1"
    echo -n -e "${CYAN}$message${NC} "
    
    # Start spinner in background
    (
        local char_index=0
        local color_index=0
        local fade_direction=1
        local brightness=100
        
        while true; do
            # Get current spinner character
            local current_char="${SPINNER_CHARS:$char_index:1}"
            
            # Get current rainbow color
            local current_color="${RAINBOW_COLORS[$color_index]}"
            
            # Create fade effect by adjusting brightness
            local fade_color=""
            if [ $brightness -gt 70 ]; then
                fade_color="$current_color"
            elif [ $brightness -gt 40 ]; then
                fade_color="\033[2m$current_color"  # Dim
            else
                fade_color="\033[2;90m"  # Very dim gray
            fi
            
            # Print the animated character with rainbow color and fade
            printf "\b\b\b   \b\b\b${fade_color}${current_char}${current_char}${current_char}${NC}"
            
            # Update indices
            char_index=$(( (char_index + 1) % ${#SPINNER_CHARS} ))
            color_index=$(( (color_index + 1) % ${#RAINBOW_COLORS[@]} ))
            
            # Update fade brightness
            brightness=$(( brightness + (fade_direction * 15) ))
            if [ $brightness -ge 100 ]; then
                brightness=100
                fade_direction=-1
            elif [ $brightness -le 20 ]; then
                brightness=20
                fade_direction=1
            fi
            
            sleep 0.08
        done
    ) &
    SPINNER_PID=$!
    disown # Prevent job control messages
}

# Function to stop loading spinner
stop_spinner() {
    if [ ! -z "$SPINNER_PID" ]; then
        kill $SPINNER_PID 2>/dev/null
        wait $SPINNER_PID 2>/dev/null
        printf "\b\b\b   \b\b\b" # Clear the triple spinner characters
        SPINNER_PID=""
    fi
}

# Cleanup function for script interruption
cleanup() {
    stop_spinner
    if [ ! -z "$ASCII_ART_PID" ]; then
        kill $ASCII_ART_PID 2>/dev/null
        wait $ASCII_ART_PID 2>/dev/null
    fi
    echo -e "\n${YELLOW}Tests interrupted${NC}"
    exit 1
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Function to make MCP request
make_mcp_request() {
    local method="$1"
    local params="$2"
    local test_name="$3"
    
    local request_body
    if [ -z "$params" ]; then
        request_body="{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$method\",\"params\":{}}"
    else
        request_body="{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$method\",\"params\":$params}"
    fi
    
    local response
    response=$(curl -s -X POST "$MCP_ENDPOINT" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -d "$request_body" || echo "CURL_ERROR")
    
    if [ "$response" = "CURL_ERROR" ]; then
        print_error "$test_name - Curl request failed"
        echo -e "${PURPLE}📤 Request:${NC} $request_body"
        return 1
    fi
    
    # Check if response contains error
    if echo "$response" | grep -q '"error"'; then
        if [ "$4" = "expect_error" ]; then
            print_success "$test_name - Error response as expected"
            return 0
        else
            print_error "$test_name - Unexpected error in response"
            echo -e "${PURPLE}📤 Request:${NC} $request_body"
            echo -e "${PURPLE}📥 Response:${NC}"
            echo "$response" | sed 's/^/    /'
            return 1
        fi
    elif echo "$response" | grep -q '"result"'; then
        # Check if MCP tool returned isError: true
        if echo "$response" | grep -q '"isError":true'; then
            if [ "$4" = "expect_error" ]; then
                print_success "$test_name - Error response as expected (MCP isError: true)"
                return 0
            else
                print_error "$test_name - Tool returned error"
                echo -e "${PURPLE}📤 Request:${NC} $request_body"
                echo -e "${PURPLE}📥 Response:${NC}"
                echo "$response" | sed 's/^/    /'
                return 1
            fi
        else
            if [ "$4" = "expect_error" ]; then
                print_error "$test_name - Expected error but got success"
                echo -e "${PURPLE}📤 Request:${NC} $request_body"
                echo -e "${PURPLE}📥 Response:${NC}"
                echo "$response" | sed 's/^/    /'
                return 1
            else
                print_success "$test_name - Success response received"
                return 0
            fi
        fi
    else
        print_error "$test_name - Invalid response format"
        echo -e "${PURPLE}📤 Request:${NC} $request_body"
        echo -e "${PURPLE}📥 Response:${NC}"
        echo "$response" | sed 's/^/    /'
        return 1
    fi
}

# Function to test server connectivity
test_server_connectivity() {
    print_test "Health Check"
    local health_response
    health_response=$(curl -s "$BASE_URL/health" || echo "CURL_ERROR")
    
    if [ "$health_response" = "CURL_ERROR" ]; then
        stop_spinner
        stop_ascii_animation "red"
        echo
        print_error "Health check failed - Server not running on port $PORT"
        echo -e "${YELLOW}💡 Start the server with: pnpm start:http${NC}"
        exit 1
    fi
    
    if echo "$health_response" | grep -q '"status":"ok"'; then
        print_success "Server is running and healthy"
    else
        stop_spinner
        stop_ascii_animation "red"
        echo
        print_error "Server health check returned unexpected response"
        echo "Response: $health_response"
        exit 1
    fi
}

# Function to test tools list
test_tools_list() {
    print_test "List Available Tools"
    make_mcp_request "tools/list" "" "List tools"
}

# Function to test echo tool
test_echo_tool() {
    
    print_test "Echo - Basic Text"
    make_mcp_request "tools/call" '{"name":"echo","arguments":{"text":"Hello World"}}' "Echo basic text"
    
    print_test "Echo - Uppercase Transform"
    make_mcp_request "tools/call" '{"name":"echo","arguments":{"text":"hello world","uppercase":true}}' "Echo with uppercase"
    
    print_test "Echo - Special Characters"
    make_mcp_request "tools/call" '{"name":"echo","arguments":{"text":"🚀 Special chars: @#$%^&*()!"}}' "Echo with special characters"
    
    print_test "Echo - Empty String"
    make_mcp_request "tools/call" '{"name":"echo","arguments":{"text":""}}' "Echo empty string"
    
    print_test "Echo - Missing Required Parameter"
    make_mcp_request "tools/call" '{"name":"echo","arguments":{}}' "Echo missing text parameter" "expect_error"
}

# Function to test calculate tool
test_calculate_tool() {
    
    print_test "Calculate - Addition"
    make_mcp_request "tools/call" '{"name":"calculate","arguments":{"operation":"add","a":5,"b":3}}' "Addition operation"
    
    print_test "Calculate - Subtraction" 
    make_mcp_request "tools/call" '{"name":"calculate","arguments":{"operation":"subtract","a":10,"b":4}}' "Subtraction operation"
    
    print_test "Calculate - Multiplication"
    make_mcp_request "tools/call" '{"name":"calculate","arguments":{"operation":"multiply","a":6,"b":7}}' "Multiplication operation"
    
    print_test "Calculate - Division"
    make_mcp_request "tools/call" '{"name":"calculate","arguments":{"operation":"divide","a":15,"b":3}}' "Division operation"
    
    print_test "Calculate - Division by Zero"
    make_mcp_request "tools/call" '{"name":"calculate","arguments":{"operation":"divide","a":10,"b":0}}' "Division by zero" "expect_error"
    
    print_test "Calculate - Invalid Operation"
    make_mcp_request "tools/call" '{"name":"calculate","arguments":{"operation":"power","a":2,"b":3}}' "Invalid operation" "expect_error"
    
    print_test "Calculate - Decimal Numbers"
    make_mcp_request "tools/call" '{"name":"calculate","arguments":{"operation":"add","a":1.5,"b":2.3}}' "Decimal addition"
    
    print_test "Calculate - Negative Numbers"
    make_mcp_request "tools/call" '{"name":"calculate","arguments":{"operation":"add","a":-5,"b":3}}' "Negative numbers"
}

# Function to test current_time tool
test_current_time_tool() {
    
    print_test "Current Time - Default Format (ISO)"
    make_mcp_request "tools/call" '{"name":"current_time","arguments":{}}' "Default time format"
    
    print_test "Current Time - ISO Format"
    make_mcp_request "tools/call" '{"name":"current_time","arguments":{"format":"iso"}}' "ISO time format"
    
    print_test "Current Time - Locale Format"
    make_mcp_request "tools/call" '{"name":"current_time","arguments":{"format":"locale"}}' "Locale time format"
    
    print_test "Current Time - Timestamp Format"
    make_mcp_request "tools/call" '{"name":"current_time","arguments":{"format":"timestamp"}}' "Timestamp format"
    
    print_test "Current Time - Invalid Format"
    make_mcp_request "tools/call" '{"name":"current_time","arguments":{"format":"invalid"}}' "Invalid time format" "expect_error"
}

# Function to test weather tool
test_weather_tool() {
    
    print_test "Weather - City Name"
    make_mcp_request "tools/call" '{"name":"get_weather","arguments":{"location":"London"}}' "Weather by city name"
    
    print_test "Weather - City with Country"
    make_mcp_request "tools/call" '{"name":"get_weather","arguments":{"location":"Tokyo,JP"}}' "Weather with country code"
    
    print_test "Weather - Coordinates"
    make_mcp_request "tools/call" '{"name":"get_weather","arguments":{"location":"40.7128,-74.0060"}}' "Weather by coordinates" "expect_error"
    
    print_test "Weather - Imperial Units"
    make_mcp_request "tools/call" '{"name":"get_weather","arguments":{"location":"New York","units":"imperial"}}' "Weather with imperial units"
    
    print_test "Weather - Metric Units"
    make_mcp_request "tools/call" '{"name":"get_weather","arguments":{"location":"Paris","units":"metric"}}' "Weather with metric units"
    
    print_test "Weather - Kelvin Units"
    make_mcp_request "tools/call" '{"name":"get_weather","arguments":{"location":"Berlin","units":"kelvin"}}' "Weather with kelvin units"
    
    print_test "Weather - Invalid Location"
    make_mcp_request "tools/call" '{"name":"get_weather","arguments":{"location":"InvalidCity12345"}}' "Weather invalid location" "expect_error"
    
    print_test "Weather - Missing Location"
    make_mcp_request "tools/call" '{"name":"get_weather","arguments":{}}' "Weather missing location" "expect_error"
}

# Function to test error scenarios
test_error_scenarios() {
    
    print_test "Invalid Tool Name"
    make_mcp_request "tools/call" '{"name":"nonexistent_tool","arguments":{}}' "Non-existent tool" "expect_error"
    
    print_test "Invalid Method"
    make_mcp_request "invalid/method" '{}' "Invalid method" "expect_error"
    
    print_test "Malformed JSON"
    local response
    local request_body='{"invalid":"json",'
    response=$(curl -s -X POST "$MCP_ENDPOINT" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -d "$request_body" || echo "CURL_ERROR")
    
    if echo "$response" | grep -q '"error"' || echo "$response" | grep -q '"statusCode".*400'; then
        print_success "Malformed JSON - Error response as expected"
    else
        print_error "Malformed JSON - Expected error response"
        echo -e "${PURPLE}📤 Request:${NC} $request_body"
        echo -e "${PURPLE}📥 Response:${NC}"
        echo "$response" | sed 's/^/    /'
    fi
}

# Function to print summary
print_summary() {
    # Stop spinner first
    stop_spinner
    
    # Determine result and stop ASCII animation with appropriate color
    if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
        stop_ascii_animation "green"
    else
        stop_ascii_animation "red"
    fi
    
    echo
    print_header "Test Summary"
    
    echo -e "📊 ${CYAN}Total Tests: ${TOTAL_TESTS}${NC}"
    echo -e "✅ ${GREEN}Passed: ${PASSED_TESTS}${NC}"
    echo -e "❌ ${RED}Failed: $((TOTAL_TESTS - PASSED_TESTS))${NC}"
    
    if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
        echo -e "\n🎉 ${GREEN}All tests passed! Your MCP server is working correctly.${NC}"
        exit 0
    else
        echo -e "\n⚠️  ${YELLOW}Some tests failed. Check the output above for details.${NC}"
        exit 1
    fi
}

# Function to start animated ASCII art in background
start_ascii_animation() {
    # Clear screen and show initial ASCII art
    printf "\033[H\033[2J"
    echo
    
    if [ "$SKIP_ANIMATION" = "true" ]; then
        # Static rainbow gradient
        for i in "${!ASCII_LINES[@]}"; do
            local color_index=$(( i % ${#RAINBOW_COLORS[@]} ))
            echo -e "${RAINBOW_COLORS[$color_index]}${ASCII_LINES[$i]}${NC}"
        done
        return
    fi
    
    # Start animated ASCII art in background
    (
        while true; do
            for color_offset in {0..7}; do
                # Move cursor to top, save cursor position for content below
                printf "\033[1;1H"
                echo
                for i in "${!ASCII_LINES[@]}"; do
                    local color_index=$(( (i + color_offset) % ${#RAINBOW_COLORS[@]} ))
                    echo -e "${RAINBOW_COLORS[$color_index]}${ASCII_LINES[$i]}${NC}"
                done
                # Move cursor to line 9 for content below ASCII art
                printf "\033[9;1H"
                sleep 0.2
            done
        done
    ) &
    ASCII_ART_PID=$!
    disown
}

# Function to stop ASCII animation and show final result
stop_ascii_animation() {
    local result_color="$1"  # "green" or "red"
    
    if [ ! -z "$ASCII_ART_PID" ]; then
        kill $ASCII_ART_PID 2>/dev/null
        wait $ASCII_ART_PID 2>/dev/null
        ASCII_ART_PID=""
    fi
    
    # Clear screen and show final colored ASCII art
    printf "\033[H\033[2J"
    echo
    
    local final_color=""
    if [ "$result_color" = "green" ]; then
        final_color="${GREEN}"
    elif [ "$result_color" = "red" ]; then
        final_color="${RED}"
    else
        # Default rainbow gradient
        for i in "${!ASCII_LINES[@]}"; do
            local color_index=$(( i % ${#RAINBOW_COLORS[@]} ))
            echo -e "${RAINBOW_COLORS[$color_index]}${ASCII_LINES[$i]}${NC}"
        done
        return
    fi
    
    # Show all lines in the result color
    for line in "${ASCII_LINES[@]}"; do
        echo -e "${final_color}${line}${NC}"
    done
}

# Main execution
main() {
    # Start animated ASCII art in background
    start_ascii_animation
    
    # Position cursor below ASCII art and add info
    printf "\033[9;1H"
    echo -e "${CYAN}MCP Template Tools Testing Script${NC}"
    echo -e "${YELLOW}Testing server on port: $PORT${NC}"
    echo -e "${YELLOW}Base URL: $BASE_URL${NC}"
    
    # Start loading animation
    start_spinner "Running tests..."
    
    # Run all tests
    test_server_connectivity
    test_tools_list
    test_echo_tool
    test_calculate_tool
    test_current_time_tool
    test_weather_tool
    test_error_scenarios
    
    print_summary
}



# Check if help is requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "MCP Template Tools Testing Script"
    echo ""
    echo "Usage: $0 [options] [port]"
    echo ""
    echo "Options:"
    echo "  -f, --fast   Skip animated intro for faster testing"
    echo "  -h, --help   Show this help message"
    echo ""
    echo "Arguments:"
    echo "  port    Port number where MCP server is running (default: 3000)"
    echo ""
    echo "Examples:"
    echo "  $0           # Test server with full animated intro"
    echo "  $0 --fast    # Test server quickly without animation"
    echo "  $0 8080      # Test server on port 8080"
    echo "  $0 -f 8080   # Test server on port 8080 without animation"
    echo ""
    echo "Prerequisites:"
    echo "  - MCP server must be running in HTTP mode"
    echo "  - Start with: pnpm start:http"
    echo ""
    exit 0
fi

# Run main function
main 
