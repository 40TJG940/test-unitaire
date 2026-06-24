CC      ?= cc
CFLAGS  ?= -O2 -Wall -Wextra -std=c11
LDLIBS  :=

# Winsock sous Windows (MinGW)
ifeq ($(OS),Windows_NT)
	LDLIBS += -lws2_32
endif

# math (strtod/isfinite) sous Unix
ifneq ($(OS),Windows_NT)
	LDLIBS += -lm
endif

BIN := calculator-backend

all: $(BIN)

$(BIN): server.c calculator.c calculator.h
	$(CC) $(CFLAGS) -o $(BIN) server.c calculator.c $(LDLIBS)

# test.c fournit son propre main ; server.c est compile sans le sien.
test: server.c calculator.c test.c calculator.h
	$(CC) $(CFLAGS) -DCALC_NO_MAIN -o run_tests test.c server.c calculator.c $(LDLIBS)
	./run_tests

run: $(BIN)
	./$(BIN)

clean:
	rm -f $(BIN) run_tests *.o $(BIN).exe run_tests.exe

.PHONY: all test run clean
