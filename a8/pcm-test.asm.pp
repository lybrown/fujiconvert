    icl 'hardware.asm'

    org $80
index org *+1

    org $2000
>>>
>>>
>>>
lo_240
    ert <*!=0
    :8 dta $A0
    :240 dta $A0|[[#+1+[#/15]]&$F]
    :8 dta $AF
hi_240
    ert <*!=0
    :8 dta $10
    :240 dta $10|[[#+1+[#/15]]>>4]
    :8 dta $1F
lo_256
    ert <*!=0
    :256 dta $A0|[#&$F]
hi_256
    ert <*!=0
    :256 dta $10|[#>>4]
lo equ lo_240
hi equ hi_240
wave
>>> for ($i = 0; $i < 256; ++$i) {
;>>>   $s = int(sin($i / 128 * 3.141592654 + 0.29) * 119.9 + 128);
>>>   $s = int(sin($i / 128 * 3.141592654) * 119.9 + 128);
    dta <<<$s>>>
>>> }
delay
    dta 8

main
    sei
    mva #0 NMIEN
    sta DMACTL
    sta AUDCTL
    mva #$F COLPM0 ; channel 1
    mva #$26 COLPM1 ; channel 2
    mva #$4 COLPM2 ; progress indicator
    mva #$4 COLPM3 ; progress indicator
    mva #$FF GRAFP0
    sta GRAFP1
    mva #$10 GRAFP2
    mva #$10 GRAFP3
    mva #0 index

    lda:rne VCOUNT
    mwa #dlist DLISTL
    mva #$22 DMACTL

start
    jsr setpulse

    ldy index ; 3 cycles
play
    ldx wave,y
    lda hi,x ; 4 cycles
    ldy lo,x ; 4 cycles
    nop
    sta WSYNC
    nop
    sta AUDC3 ; 4 cycles
    sty AUDC1
    stx HPOSP0 ; 4 cycles
    inc index
    ldy index
    jmp play

setpulse
    ; 1.79Mhz for channel 1
FAST1 equ 1<<6
    ; 1.79Mhz for channel 3
FAST3 equ 1<<5
    ; HiPass 1+3
HI13 equ 1<<2
    ; 15Khz
KHZ15 equ 1<<0
    mva #[FAST1|FAST3|HI13] AUDCTL
    ; Set up 1/16 dutycycle HiPass on 1+3
    ldx pindex
    mva paudf3,x AUDF3
    mva paudf1,x AUDF1
    sta STIMER
    sta AUDF3
    ldx delay
    dex:rne
    rts
pindex
    dta 1
paudf1
    dta 12,3,2
paudf3
    dta 13,5,4

dlist
    :4 dta $70
    dta $47,a(scr)
    :4 dta $7
    dta $41,a(dlist)
scr
scr_wave equ *+10
    dta d'1) WAVEFORM: TRI    '
scr_range equ *+10
    dta d'2) RANGE:           '
scr_offset equ *+10
    dta d'3) OFFSET:          '
scr_pulse equ *+10
    dta d'4) PULSE:           '

    run main
