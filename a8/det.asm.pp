    icl 'hardware.asm'

    org $2000
    icl 'ramdetect.asm'
main
    jmp *
delay
    lda 20
    add #3
    cmp:rne 20
    rts
init
    jmp detectram
    run main
    ini init

>>> for (0 .. 64) {
    ini prepnextbank
    ini delay
>>> }
