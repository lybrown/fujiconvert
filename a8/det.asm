    icl 'hardware.asm'

    org $2000
    icl 'ramdetect.asm'
main
    jsr detectram
    jmp *
    run main
