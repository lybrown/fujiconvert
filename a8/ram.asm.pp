    icl 'hardware.asm'

    org $2000
lo
    ert <*!=0
    :256 dta $A0|[#&$F]
hi
    ert <*!=0
    :256 dta $10|[#>>4]

    icl 'ramdetect.asm'
    icl 'splash.asm'

main
    jsr splash

    ; disable interrupts, ANTIC, POKEY
    sei
    mva #0 NMIEN
    sta DMACTL
    sta AUDCTL

    ; graphics
    mva #$F COLPM0
    mva #$FF GRAFP0

    ; init POKEY
    mva #3 SKCTL
    ; 1.79Mhz for channel 1
FAST1 equ 1<<6
    ; 1.79Mhz for channel 3
FAST3 equ 1<<5
    ; HiPass 1+3
HI13 equ 1<<2
    ; 15Khz
KHZ15 equ 1<<0
    mva #[FAST1|FAST3|HI13] AUDCTL
    lda #0
    ldx #7
    sta:rpl AUDF1,x-

    ; init bank
    mwa #0 bankindex

window equ $4000
NOP0 equ 0
NOP equ $FE00
laststart equ $82
    sta laststart

    jsr setpulse

    ldy #0
play
    ; pages 0-61
>>> for $page (0 .. 61) {
    ldx window+<<<$page>>>*$100,y ; 4 cycles
    mva hi,x AUDC3 ; 8 cycles
    mva lo,x AUDC1 ; 8 cycles
    ; 20 cycles
    ; Pad to 37 cycles by adding 17 cycles of nop:
    stx HPOSP0 ; 4 cycles
    rol NOP,x ; 7 cycles
    rol NOP ; 6 cycles
>>> }
    ; page 62
    ldx window+62*$100,y ; 4 cycles
    mva hi,x AUDC3 ; 8 cycles
    mva lo,x AUDC1 ; 8 cycles
    ; 20 cycles
    ; Pad to 37 cycles by adding 17 cycles of nop:
    lda CONSOL ; 4 cycles
    and #1 ; 2 cycles
    cmp:sta laststart ; 5 cycles
    bcc toggle ; 2 cycles
    lda NOP,x ; 4 cycles NOP
    ; page 63
page63
    ldx window+63*$100,y ; 4 cycles
    mva hi,x AUDC3 ; 8 cycles
    mva lo,x AUDC1 ; 8 cycles
    iny ; 2 cycles
branch
    beq next ; 2 cycles +1 if taken same page
    :2 rol NOP0 ; 5+5 cycles
    jmp play ; 3 cycles
next
    ; ert [>next]!=[>branch]

    ; Go to next RAM bank
setbank
    lda banks ; 4 cycles
    bne setbank2 ; 3 cycles
    mva #0 setbank+1 ; 6 cycles
    lda banks ; 4 cycles
setbank2
    sta PORTB ; 4 cycles
    inc setbank+1 ; 6 cycles
    jmp play ; 3 cycles
codeend

toggle
    jsr setpulse
    jmp page63

setpulse
    ; Set up 1/16 dutycycle HiPass on 1+3
    ldx pindex
    mva paudf3,x AUDF3
    mva paudf1,x AUDF1
    sta STIMER
    sta AUDF3
    lda #1
    eor:sta pindex
    beq altirra
    mva #$0 COLBK
    mva #$F COLPM0
    rts
altirra
    mva #$F COLBK
    mva #$0 COLPM0
    rts
pindex
    dta 0
paudf1
    dta 12,3
paudf3
    dta 13,5

    run main
