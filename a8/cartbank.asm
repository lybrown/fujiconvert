prevbank_xegs
prevbank_megacart
    :2 dec bank
nextbank_xegs
nextbank_megacart
    ldx bank
    stx $D500
    inx
    stx bank
    jmp play

prevbank_atarimax
prevbank_megamax
    :2 dec bank
nextbank_atarimax
nextbank_megamax
    ldx bank
    sta $D500,x
    inx
    stx bank
    jmp play

prevbank_sic
    :2 dec bank
nextbank_sic
    lda bank
    and #$1F
    ora #$20
    sta $D500
    inc bank
    jmp play

nextbank_thecart
    inc $D5A0
    sne:inc $D5A1
    jmp play

prevbank_thecart
    lda $D5A0
    php
    dec $D5A0
    plp
    sne:dec $D5A1
    jmp play

init_xegs
init_megacart
init_atarimax
init_megamax
init_sic
    mva #0 bank
    rts

init_thecart
    mwa #1 $D5A0
    rts
