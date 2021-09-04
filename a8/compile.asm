    icl 'hardware.asm'
COVOX equ $D600

NOP0 equ 0
NOP equ $D800

    org $80
bank org *+1
bank80 org *+1
diff org *+1

    org $00FF
T_END   org *+$100    ; end of snippet
T_BANKPAGE org *+$100 ; bank page #
T_AUDC1 org *+$100    ; AUDC1 address
T_AUDC2 org *+$100    ; AUDC2 address
T_AUDF1 org *+$100    ; AUDF1 address
T_COVOX org *+$100    ; COVOX address
T_ENDLO org *+$100    ; end bank
T_ENDHI org *+$100    ; end bank
T_ATEND org *+$100    ; end handler
T_KEYEVENT org *+$100 ; keyevent handler
T_PLAY org *+$100     ; start of player routine

    org $2000
lo  org *+$100
hi  org *+$100
map_AUDC1
    dta a(AUDC1)
map_AUDC2
    dta a(AUDC2)
map_AUDF1
    dta a(AUDF1)
map_COVOX
    dta a(COVOX)
nop192
    jsr nop96
nop96
    jsr nop48
nop48
    jsr nop24
nop24
    jsr nop12
nop12
    rts




pdm_out
    lda T_BANKPAGE,y ; 4
    mva lo,x T_AUDC1 ; 8
    mva hi,x T_AUDC2 ; 8
    dta a(T_END),20
pcm_out
    lda T_BANKPAGE,y ; 4
    mva lo,x T_AUDC1 ; 8
    dta a(T_END),12
pwm_out
    lda T_BANKPAGE,y ; 4
    mva lo,x T_AUDF1 ; 8
    sta STIMER ; 4
    dta a(T_END),16
covox_out
    lda T_BANKPAGE,y ; 4
    mva lo,x T_COVOX ; 8
    dta a(T_END),12
waveform0_out
    sta HPOSP0 ; 4
    dta a(T_END),4
waveform1_out
    sta HPOSP1 ; 4
    dta a(T_END),4
progress_bar_thecart
    mva $D5A0 bank ; 7
    dta a(T_END),7
progress_bar1_out
    mva bank HPOSP2 ; 7
    dta a(T_END),7
progress_bar2_ph1_out
    clc ; 2
    dta a(T_END),2
progress_bar2_ph2_out
    lda bank ; 3
    adc #$80 ; 2
    sta bank80 ; 3
    dta a(T_END),8
progress_bar2_ph3_out
    mva bank80 HPOSP3 ; 7
    dta a(T_END),7
detectend_ph1
    lda bank ; 3
    eor T_ENDLO ; 2
    sta diff ; 3
    dta a(T_END),8
detectend_ph2
    lda bank+1 ; 3
    eor T_ENDHI ; 2
    sta diff+1 ; 3
    dta a(T_END),8
detectend_ph3
    lda diff ; 3
    ora diff+1 ; 3
    sne:jmp T_ATEND ; 3+2
    dta a(T_END),9
detectkey
    lda SKSTAT ; 4
    and #4 ; 2
    seq:jmp T_KEYEVENT
    dta a(T_END),8
nextindex
    iny ; 2
    jne T_PLAY ; 5-2
    dta a(T_END),7
nextbank_ram
    ldy bank ; 3
    mva nextbank,y bank ; 7
    sta PORTB ; 4
    dta a(T_END),14
nextbank_xegs_megacart_sic
    ldy bank ; 3
    mva nextbank,y bank ; 7
    sta $D500 ; 4
    dta a(T_END),14
nextbank_atarimax_megamax
    ldy bank ; 3
    mvx nextbank,y bank ; 7
    sta $D500,x ; 4
    dta a(T_END),14
nextbank_thecart
    inc $D5A0 ; 6
    sne:inc $D5A1 ; 3+5
    dta a(T_END),9
reverse_ram
    ldy bank ; 3
    mva reverse,y bank ; 7
    sta PORTB ; 4
    dta a(T_END),14
reverse_xegs_megacart_sic
    ldy bank ; 3
    mva reverse,y bank ; 7
    sta $D500 ; 4
    dta a(T_END),14
reverse_atarimax_megamax
    ldy bank ; 3
    mvx reverse,y bank ; 7
    sta $D500,x ; 4
    dta a(T_END),14
reverse_thecart
    lda #$FC ; -4 ; 2
    add:sta $D5A0 ; 8
    lda #$FF ; 2
    adc:sta $D5A1 ; 8
    dta a(T_END),20

tmpl_nop192
    jsr nop192 ; 192
    dta a(T_END),192
tmpl_nop96
    jsr nop96 ; 96
    dta a(T_END),96
tmpl_nop48
    jsr nop48 ; 48
    dta a(T_END),48
tmpl_nop24
    jsr nop24 ; 24
    dta a(T_END),24
tmpl_nop12
    jsr nop12 ; 12
    dta a(T_END),12
tmpl_nop6
    lda (NOP0,x) ; 6
    dta a(T_END),6
tmpl_nop5
    lda (NOP0),y ; 5
    dta a(T_END),5
tmpl_nop4
    lda NOP ; 4
    dta a(T_END),4
tmpl_nop3
    lda NOP0 ; 3
    dta a(T_END),3
tmpl_nop2
    nop ; 2
    dta a(T_END),2

nextbank
    :256 dta 0
reverse
    :256 dta 0
