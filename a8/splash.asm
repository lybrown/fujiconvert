splash
    ; disable interrupts, ANTIC, POKEY
    sei
    mva #0 NMIEN
    sta DMACTL
    sta AUDCTL
    mwa #dlist DLISTL
    mva #0 COLPF2
    mva #15 COLPF1
    lda:rne VCOUNT
    mva #$22 DMACTL

    lda SKSTAT
    sta lastkey
wait
    lda SKSTAT
    cmp:sta lastkey
    bcc splashdone
    lda TRIG0
    beq splashdone
    lda CONSOL
    and #7
    cmp #7
    bne splashdone
    jmp wait

lastkey
    dta 0
splashdone
    rts

dlist
    :6 dta $70
    dta $42,a(scr)
    :19 dta 2
    dta $41,a(dlist)
scr
    ;     0123456789012345678901234567890123456789
    :40*20 dta 0
;    dta d' Song:                                  '
;    dta d' Length:                                '
;    dta d' Playback method:                       '
;    dta d' Frequency:                             '
;    dta d'    Press any key to start playback     '
;    dta d' Keys:                                  '
;    dta d' < - Rewind                             '
;    dta d' > - Fast Forward                       '
;    dta d' DEL - Play from start                  '
;    dta d' A - Toggle between Altirra/hardware    '
scrlen equ *-scr
