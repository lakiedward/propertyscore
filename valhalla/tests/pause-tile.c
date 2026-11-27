#define _GNU_SOURCE
#include <dlfcn.h>
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static void pause_for_test(const char *path) {
    const char *marker = getenv("VALHALLA_TEST_TILE_MARKER");
    size_t length = strlen(path);
    if (marker && length >= 4 && strcmp(path + length - 4, ".gph") == 0) {
        int fd = open(marker, O_WRONLY | O_CREAT | O_EXCL, 0600);
        if (fd >= 0) {
            dprintf(fd, "%ld %s\n", (long)getpid(), path);
            close(fd);
            raise(SIGSTOP);
        }
    }
}

FILE *fopen(const char *path, const char *mode) {
    FILE *(*original)(const char *, const char *) = dlsym(RTLD_NEXT, "fopen");
    pause_for_test(path);
    return original(path, mode);
}

FILE *fopen64(const char *path, const char *mode) {
    FILE *(*original)(const char *, const char *) = dlsym(RTLD_NEXT, "fopen64");
    pause_for_test(path);
    return original(path, mode);
}
