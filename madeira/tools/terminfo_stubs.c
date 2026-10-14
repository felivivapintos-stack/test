/* LLVM's Support library (linked into libdxmt_combined.a for DXMT's shader
 * compiler) probes the terminal through terminfo to decide whether to colour
 * its output. iOS has no terminfo at link time; inside the app there is never
 * a terminal, so report "no terminal" and let LLVM print without colours. */
struct term;
struct term *cur_term;

int setupterm(const char *term, int fd, int *errret)
{
    (void)term; (void)fd;
    if (errret) *errret = -1;
    return -1;
}

struct term *set_curterm(struct term *nterm)
{
    struct term *old = cur_term;
    cur_term = nterm;
    return old;
}

int del_curterm(struct term *oterm)
{
    (void)oterm;
    return 0;
}

int tigetnum(const char *capname)
{
    (void)capname;
    return -2;
}
